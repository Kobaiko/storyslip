-- Content Workflow System Migration

-- Create content workflows table
CREATE TABLE IF NOT EXISTS content_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  current_status VARCHAR(20) DEFAULT 'draft' CHECK (current_status IN ('draft', 'review', 'approved', 'rejected')),
  assigned_reviewer UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workflow history table for tracking all workflow changes
CREATE TABLE IF NOT EXISTS content_workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES content_workflows(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  from_status VARCHAR(20),
  to_status VARCHAR(20),
  notes TEXT,
  performed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content approval settings table
CREATE TABLE IF NOT EXISTS content_approval_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  require_approval BOOLEAN DEFAULT false,
  auto_assign_reviewer BOOLEAN DEFAULT false,
  default_reviewer UUID REFERENCES users(id) ON DELETE SET NULL,
  approval_roles TEXT[] DEFAULT ARRAY['admin', 'editor'],
  notification_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(website_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_workflows_content_id ON content_workflows(content_id);
CREATE INDEX IF NOT EXISTS idx_content_workflows_status ON content_workflows(current_status);
CREATE INDEX IF NOT EXISTS idx_content_workflows_reviewer ON content_workflows(assigned_reviewer);
CREATE INDEX IF NOT EXISTS idx_content_workflows_submitted_by ON content_workflows(submitted_by);
CREATE INDEX IF NOT EXISTS idx_content_workflows_submitted_at ON content_workflows(submitted_at);

CREATE INDEX IF NOT EXISTS idx_workflow_history_workflow_id ON content_workflow_history(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_history_performed_by ON content_workflow_history(performed_by);
CREATE INDEX IF NOT EXISTS idx_workflow_history_performed_at ON content_workflow_history(performed_at);

CREATE INDEX IF NOT EXISTS idx_approval_settings_website_id ON content_approval_settings(website_id);

-- Add triggers for workflow history tracking
CREATE OR REPLACE FUNCTION track_workflow_changes()
RETURNS TRIGGER AS $
DECLARE
  action_name VARCHAR(50);
BEGIN
  -- Determine the action based on the trigger operation
  IF TG_OP = 'INSERT' THEN
    action_name := 'workflow_created';
    INSERT INTO content_workflow_history (
      workflow_id, action, to_status, notes, performed_by
    ) VALUES (
      NEW.id, action_name, NEW.current_status, 'Workflow created', NEW.submitted_by
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only track status changes
    IF OLD.current_status != NEW.current_status THEN
      CASE NEW.current_status
        WHEN 'review' THEN action_name := 'submitted_for_review';
        WHEN 'approved' THEN action_name := 'approved';
        WHEN 'rejected' THEN action_name := 'rejected';
        ELSE action_name := 'status_changed';
      END CASE;
      
      INSERT INTO content_workflow_history (
        workflow_id, action, from_status, to_status, notes, performed_by
      ) VALUES (
        NEW.id, action_name, OLD.current_status, NEW.current_status, 
        NEW.reviewer_notes, COALESCE(NEW.assigned_reviewer, NEW.submitted_by)
      );
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_workflow_changes
  AFTER INSERT OR UPDATE ON content_workflows
  FOR EACH ROW
  EXECUTE FUNCTION track_workflow_changes();

-- Function to update workflow updated_at timestamp
CREATE OR REPLACE FUNCTION update_workflow_updated_at()
RETURNS TRIGGER AS $
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_workflow_updated_at
  BEFORE UPDATE ON content_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_updated_at();

CREATE TRIGGER trigger_update_approval_settings_updated_at
  BEFORE UPDATE ON content_approval_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_updated_at();

-- Add RLS policies for content workflows
ALTER TABLE content_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_workflow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_approval_settings ENABLE ROW LEVEL SECURITY;

-- Content workflows policies
CREATE POLICY "Users can view workflows for content they have access to" ON content_workflows
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content c
      JOIN websites w ON c.website_id = w.id
      JOIN website_users wu ON w.id = wu.website_id
      WHERE c.id = content_workflows.content_id
      AND wu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workflows for content they can edit" ON content_workflows
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM content c
      JOIN websites w ON c.website_id = w.id
      JOIN website_users wu ON w.id = wu.website_id
      WHERE c.id = content_workflows.content_id
      AND wu.user_id = auth.uid()
      AND wu.role IN ('admin', 'editor', 'author')
    )
  );

CREATE POLICY "Users can update workflows they submitted or are assigned to review" ON content_workflows
  FOR UPDATE USING (
    submitted_by = auth.uid() OR 
    assigned_reviewer = auth.uid() OR
    EXISTS (
      SELECT 1 FROM content c
      JOIN websites w ON c.website_id = w.id
      JOIN website_users wu ON w.id = wu.website_id
      WHERE c.id = content_workflows.content_id
      AND wu.user_id = auth.uid()
      AND wu.role = 'admin'
    )
  );

-- Workflow history policies
CREATE POLICY "Users can view workflow history for content they have access to" ON content_workflow_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content_workflows cw
      JOIN content c ON cw.content_id = c.id
      JOIN websites w ON c.website_id = w.id
      JOIN website_users wu ON w.id = wu.website_id
      WHERE cw.id = content_workflow_history.workflow_id
      AND wu.user_id = auth.uid()
    )
  );

-- Approval settings policies
CREATE POLICY "Users can view approval settings for their websites" ON content_approval_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM website_users wu
      WHERE wu.website_id = content_approval_settings.website_id
      AND wu.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage approval settings" ON content_approval_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM website_users wu
      WHERE wu.website_id = content_approval_settings.website_id
      AND wu.user_id = auth.uid()
      AND wu.role = 'admin'
    )
  );

-- Create function to get workflow statistics
CREATE OR REPLACE FUNCTION get_workflow_stats(website_uuid UUID)
RETURNS TABLE (
  total_submissions BIGINT,
  pending_reviews BIGINT,
  approved_content BIGINT,
  rejected_content BIGINT,
  average_review_time_hours NUMERIC
) AS $
BEGIN
  RETURN QUERY
  WITH workflow_data AS (
    SELECT 
      cw.current_status,
      cw.submitted_at,
      cw.reviewed_at,
      EXTRACT(EPOCH FROM (cw.reviewed_at - cw.submitted_at)) / 3600 as review_time_hours
    FROM content_workflows cw
    JOIN content c ON cw.content_id = c.id
    WHERE c.website_id = website_uuid
  )
  SELECT 
    COUNT(*)::BIGINT as total_submissions,
    COUNT(*) FILTER (WHERE current_status = 'review')::BIGINT as pending_reviews,
    COUNT(*) FILTER (WHERE current_status = 'approved')::BIGINT as approved_content,
    COUNT(*) FILTER (WHERE current_status = 'rejected')::BIGINT as rejected_content,
    COALESCE(AVG(review_time_hours) FILTER (WHERE review_time_hours IS NOT NULL), 0)::NUMERIC as average_review_time_hours
  FROM workflow_data;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_workflow_stats(UUID) TO authenticated;

-- Insert default approval settings for existing websites
INSERT INTO content_approval_settings (website_id, require_approval, auto_assign_reviewer)
SELECT id, false, false
FROM websites
ON CONFLICT (website_id) DO NOTHING;
-- Enhanced Content Management System Migration

-- Add rich content support to existing content table
ALTER TABLE content 
ADD COLUMN IF NOT EXISTS rich_content JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS meta_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS enable_comments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS template VARCHAR(50) DEFAULT 'default',
ADD COLUMN IF NOT EXISTS content_type VARCHAR(50) DEFAULT 'article',
ADD COLUMN IF NOT EXISTS reading_time INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0;

-- Update SEO keywords to be an array
ALTER TABLE content 
ALTER COLUMN seo_keywords TYPE TEXT[] USING string_to_array(seo_keywords, ',');

-- Create content revisions table
CREATE TABLE IF NOT EXISTS content_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  excerpt TEXT,
  rich_content JSONB DEFAULT '[]',
  revision_number INTEGER NOT NULL,
  change_summary TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content schedules table
CREATE TABLE IF NOT EXISTS content_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('publish', 'unpublish', 'archive')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Create content templates table
CREATE TABLE IF NOT EXISTS content_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content collaborators table (for multi-author content)
CREATE TABLE IF NOT EXISTS content_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'contributor' CHECK (role IN ('author', 'editor', 'contributor', 'reviewer')),
  permissions JSONB DEFAULT '{}',
  added_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(content_id, user_id)
);

-- Create content comments table
CREATE TABLE IF NOT EXISTS content_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES content_comments(id) ON DELETE CASCADE,
  author_name VARCHAR(255) NOT NULL,
  author_email VARCHAR(255) NOT NULL,
  author_website VARCHAR(500),
  comment_text TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'spam')),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create content search index table for full-text search
CREATE TABLE IF NOT EXISTS content_search_index (
  content_id UUID PRIMARY KEY REFERENCES content(id) ON DELETE CASCADE,
  search_vector tsvector,
  keywords TEXT[],
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_revisions_content_id ON content_revisions(content_id);
CREATE INDEX IF NOT EXISTS idx_content_revisions_revision_number ON content_revisions(content_id, revision_number);

CREATE INDEX IF NOT EXISTS idx_content_schedules_content_id ON content_schedules(content_id);
CREATE INDEX IF NOT EXISTS idx_content_schedules_scheduled_at ON content_schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_content_schedules_status ON content_schedules(status);

CREATE INDEX IF NOT EXISTS idx_content_templates_website_id ON content_templates(website_id);
CREATE INDEX IF NOT EXISTS idx_content_templates_is_default ON content_templates(website_id, is_default);

CREATE INDEX IF NOT EXISTS idx_content_collaborators_content_id ON content_collaborators(content_id);
CREATE INDEX IF NOT EXISTS idx_content_collaborators_user_id ON content_collaborators(user_id);

CREATE INDEX IF NOT EXISTS idx_content_comments_content_id ON content_comments(content_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_status ON content_comments(status);
CREATE INDEX IF NOT EXISTS idx_content_comments_parent_id ON content_comments(parent_id);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_content_search_vector ON content_search_index USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_content_keywords ON content_search_index USING gin(keywords);

-- Enhanced content table indexes
CREATE INDEX IF NOT EXISTS idx_content_content_type ON content(content_type);
CREATE INDEX IF NOT EXISTS idx_content_template ON content(template);
CREATE INDEX IF NOT EXISTS idx_content_reading_time ON content(reading_time);
CREATE INDEX IF NOT EXISTS idx_content_word_count ON content(word_count);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_content_website_status_published ON content(website_id, status, published_at);
CREATE INDEX IF NOT EXISTS idx_content_website_type_status ON content(website_id, content_type, status);

-- Add triggers for automatic updates
CREATE OR REPLACE FUNCTION update_content_search_index()
RETURNS TRIGGER AS $$
BEGIN
  -- Update search vector
  INSERT INTO content_search_index (content_id, search_vector, keywords, updated_at)
  VALUES (
    NEW.id,
    to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.body, '') || ' ' || COALESCE(NEW.excerpt, '')),
    NEW.seo_keywords,
    NOW()
  )
  ON CONFLICT (content_id) DO UPDATE SET
    search_vector = to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.body, '') || ' ' || COALESCE(NEW.excerpt, '')),
    keywords = NEW.seo_keywords,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_content_search_index
  AFTER INSERT OR UPDATE ON content
  FOR EACH ROW
  EXECUTE FUNCTION update_content_search_index();

-- Function to calculate reading time and word count
CREATE OR REPLACE FUNCTION calculate_content_metrics()
RETURNS TRIGGER AS $$
DECLARE
  word_count INTEGER;
  reading_time INTEGER;
BEGIN
  -- Calculate word count (approximate)
  word_count := array_length(string_to_array(regexp_replace(COALESCE(NEW.body, ''), '<[^>]*>', '', 'g'), ' '), 1);
  
  -- Calculate reading time (assuming 200 words per minute)
  reading_time := GREATEST(1, ROUND(word_count / 200.0));
  
  NEW.word_count := COALESCE(word_count, 0);
  NEW.reading_time := reading_time;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_content_metrics
  BEFORE INSERT OR UPDATE ON content
  FOR EACH ROW
  EXECUTE FUNCTION calculate_content_metrics();

-- Function to auto-generate excerpt if not provided
CREATE OR REPLACE FUNCTION auto_generate_excerpt()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.excerpt IS NULL OR NEW.excerpt = '' THEN
    -- Generate excerpt from body (first 200 characters, word boundary)
    NEW.excerpt := LEFT(
      regexp_replace(COALESCE(NEW.body, ''), '<[^>]*>', '', 'g'),
      200
    );
    
    -- Ensure we don't cut off in the middle of a word
    IF LENGTH(NEW.excerpt) = 200 THEN
      NEW.excerpt := LEFT(NEW.excerpt, LENGTH(NEW.excerpt) - POSITION(' ' IN REVERSE(NEW.excerpt))) || '...';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_excerpt
  BEFORE INSERT OR UPDATE ON content
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_excerpt();

-- Function to update content updated_at timestamp
CREATE OR REPLACE FUNCTION update_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_content_updated_at
  BEFORE UPDATE ON content
  FOR EACH ROW
  EXECUTE FUNCTION update_content_updated_at();

-- Function to handle content status changes
CREATE OR REPLACE FUNCTION handle_content_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Set published_at when status changes to published
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    NEW.published_at = NOW();
  END IF;
  
  -- Clear published_at when status changes from published
  IF NEW.status != 'published' AND OLD.status = 'published' THEN
    NEW.published_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_content_status_change
  BEFORE UPDATE ON content
  FOR EACH ROW
  EXECUTE FUNCTION handle_content_status_change();

-- Add RLS policies for content management
ALTER TABLE content_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_comments ENABLE ROW LEVEL SECURITY;

-- Content revisions policies
CREATE POLICY "Users can view revisions of content they have access to" ON content_revisions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content c
      JOIN websites w ON c.website_id = w.id
      JOIN website_users wu ON w.id = wu.website_id
      WHERE c.id = content_revisions.content_id
      AND wu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create revisions for content they can edit" ON content_revisions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM content c
      JOIN websites w ON c.website_id = w.id
      JOIN website_users wu ON w.id = wu.website_id
      WHERE c.id = content_revisions.content_id
      AND wu.user_id = auth.uid()
      AND wu.role IN ('admin', 'editor', 'author')
    )
  );

-- Content schedules policies
CREATE POLICY "Users can view schedules for content they have access to" ON content_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content c
      JOIN websites w ON c.website_id = w.id
      JOIN website_users wu ON w.id = wu.website_id
      WHERE c.id = content_schedules.content_id
      AND wu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create schedules for content they can edit" ON content_schedules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM content c
      JOIN websites w ON c.website_id = w.id
      JOIN website_users wu ON w.id = wu.website_id
      WHERE c.id = content_schedules.content_id
      AND wu.user_id = auth.uid()
      AND wu.role IN ('admin', 'editor', 'author')
    )
  );

-- Content templates policies
CREATE POLICY "Users can view templates for their websites" ON content_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM website_users wu
      WHERE wu.website_id = content_templates.website_id
      AND wu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage templates for websites they admin" ON content_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM website_users wu
      WHERE wu.website_id = content_templates.website_id
      AND wu.user_id = auth.uid()
      AND wu.role IN ('admin', 'editor')
    )
  );

-- Content collaborators policies
CREATE POLICY "Users can view collaborators for content they have access to" ON content_collaborators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content c
      JOIN websites w ON c.website_id = w.id
      JOIN website_users wu ON w.id = wu.website_id
      WHERE c.id = content_collaborators.content_id
      AND wu.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage collaborators for content they can edit" ON content_collaborators
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM content c
      JOIN websites w ON c.website_id = w.id
      JOIN website_users wu ON w.id = wu.website_id
      WHERE c.id = content_collaborators.content_id
      AND wu.user_id = auth.uid()
      AND wu.role IN ('admin', 'editor', 'author')
    )
  );

-- Content comments policies (public read, moderated write)
CREATE POLICY "Anyone can view approved comments" ON content_comments
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Website users can view all comments for their content" ON content_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM content c
      JOIN websites w ON c.website_id = w.id
      JOIN website_users wu ON w.id = wu.website_id
      WHERE c.id = content_comments.content_id
      AND wu.user_id = auth.uid()
    )
  );

CREATE POLICY "Website moderators can manage comments" ON content_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM content c
      JOIN websites w ON c.website_id = w.id
      JOIN website_users wu ON w.id = wu.website_id
      WHERE c.id = content_comments.content_id
      AND wu.user_id = auth.uid()
      AND wu.role IN ('admin', 'editor')
    )
  );
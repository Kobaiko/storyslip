-- Create AI content usage tracking table
CREATE TABLE IF NOT EXISTS ai_content_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL, -- 'generate', 'enhance', 'translate', 'ideas'
    content_type VARCHAR(50), -- 'blog_post', 'article', etc.
    prompt_length INTEGER,
    response_length INTEGER,
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI content cache table for expensive operations
CREATE TABLE IF NOT EXISTS ai_content_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(255) NOT NULL UNIQUE,
    request_hash VARCHAR(64) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    request_data JSONB NOT NULL,
    response_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI templates table for custom user templates
CREATE TABLE IF NOT EXISTS ai_content_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(50) NOT NULL,
    prompt_template TEXT NOT NULL,
    default_settings JSONB NOT NULL DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI content generations table for history
CREATE TABLE IF NOT EXISTS ai_content_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id UUID REFERENCES content(id) ON DELETE SET NULL,
    generation_type VARCHAR(50) NOT NULL,
    original_prompt TEXT,
    generated_content TEXT NOT NULL,
    generated_title VARCHAR(500),
    generated_outline JSONB,
    seo_score INTEGER,
    readability_score INTEGER,
    suggestions JSONB,
    settings JSONB NOT NULL DEFAULT '{}',
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_content_usage_user_id ON ai_content_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_content_usage_created_at ON ai_content_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_content_usage_request_type ON ai_content_usage(request_type);

CREATE INDEX IF NOT EXISTS idx_ai_content_cache_cache_key ON ai_content_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_content_cache_expires_at ON ai_content_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_content_cache_request_hash ON ai_content_cache(request_hash);

CREATE INDEX IF NOT EXISTS idx_ai_content_templates_user_id ON ai_content_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_content_templates_template_type ON ai_content_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_ai_content_templates_is_public ON ai_content_templates(is_public);

CREATE INDEX IF NOT EXISTS idx_ai_content_generations_user_id ON ai_content_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_content_generations_content_id ON ai_content_generations(content_id);
CREATE INDEX IF NOT EXISTS idx_ai_content_generations_created_at ON ai_content_generations(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_content_generations_generation_type ON ai_content_generations(generation_type);

-- Create function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_ai_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM ai_content_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to update AI template usage count
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE ai_content_templates 
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_content_templates_updated_at
    BEFORE UPDATE ON ai_content_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_content_generations_updated_at
    BEFORE UPDATE ON ai_content_generations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE ai_content_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_content_generations ENABLE ROW LEVEL SECURITY;

-- Users can only access their own AI usage data
CREATE POLICY ai_content_usage_user_policy ON ai_content_usage
    FOR ALL USING (user_id = auth.uid());

-- Users can access their own templates and public templates
CREATE POLICY ai_content_templates_user_policy ON ai_content_templates
    FOR ALL USING (user_id = auth.uid() OR is_public = true);

-- Users can only access their own AI generations
CREATE POLICY ai_content_generations_user_policy ON ai_content_generations
    FOR ALL USING (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON ai_content_usage TO authenticated;
GRANT ALL ON ai_content_cache TO authenticated;
GRANT ALL ON ai_content_templates TO authenticated;
GRANT ALL ON ai_content_generations TO authenticated;

-- Insert default public templates
INSERT INTO ai_content_templates (id, user_id, name, description, template_type, prompt_template, default_settings, is_public) VALUES
(gen_random_uuid(), (SELECT id FROM users WHERE email = 'system@storyslip.com' LIMIT 1), 'Blog Post Generator', 'Create engaging blog posts with SEO optimization', 'blog_post', 'Write a comprehensive blog post about {topic}. Include an engaging introduction, detailed main points, and a compelling conclusion. Target audience: {audience}', '{"contentType": "blog_post", "tone": "conversational", "length": "medium", "includeOutline": true}', true),
(gen_random_uuid(), (SELECT id FROM users WHERE email = 'system@storyslip.com' LIMIT 1), 'Social Media Post', 'Create engaging social media content', 'social_media', 'Create an engaging social media post about {topic}. Make it attention-grabbing and include relevant hashtags. Platform: {platform}', '{"contentType": "social_media", "tone": "casual", "length": "short", "includeOutline": false}', true),
(gen_random_uuid(), (SELECT id FROM users WHERE email = 'system@storyslip.com' LIMIT 1), 'Product Description', 'Write compelling product descriptions', 'product_description', 'Write a compelling product description for {product}. Highlight key features, benefits, and what makes it unique. Target customer: {customer}', '{"contentType": "product_description", "tone": "persuasive", "length": "short", "includeOutline": false}', true),
(gen_random_uuid(), (SELECT id FROM users WHERE email = 'system@storyslip.com' LIMIT 1), 'Email Newsletter', 'Create effective email newsletters', 'email', 'Write an engaging email newsletter about {topic}. Include a compelling subject line, engaging content, and clear call-to-action. Audience: {audience}', '{"contentType": "email", "tone": "friendly", "length": "medium", "includeOutline": false}', true),
(gen_random_uuid(), (SELECT id FROM users WHERE email = 'system@storyslip.com' LIMIT 1), 'How-to Guide', 'Create step-by-step instructional content', 'article', 'Create a comprehensive how-to guide for {topic}. Include clear step-by-step instructions, tips, and common pitfalls to avoid. Skill level: {level}', '{"contentType": "article", "tone": "professional", "length": "long", "includeOutline": true}', true),
(gen_random_uuid(), (SELECT id FROM users WHERE email = 'system@storyslip.com' LIMIT 1), 'Landing Page Copy', 'Create high-converting landing page content', 'landing_page', 'Write compelling landing page copy for {product/service}. Include a powerful headline, benefits, social proof, and strong call-to-action. Goal: {goal}', '{"contentType": "landing_page", "tone": "persuasive", "length": "long", "includeOutline": true}', true)
ON CONFLICT DO NOTHING;
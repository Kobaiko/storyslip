import { supabase } from '../config/supabase';
import { DatabaseResult } from '../types/database';

export interface SampleContent {
  title: string;
  content: string;
  excerpt: string;
  status: 'published' | 'draft';
  category?: string;
  tags?: string[];
}

export class SampleContentService {
  private static readonly SAMPLE_ARTICLES: SampleContent[] = [
    {
      title: 'Welcome to Your New Blog',
      content: `
        <h2>Getting Started with StorySlip</h2>
        <p>Congratulations on setting up your new blog with StorySlip! This is your first sample article to help you get familiar with the platform.</p>
        
        <h3>What You Can Do</h3>
        <ul>
          <li>Create and edit content with our rich text editor</li>
          <li>Organize your content with categories and tags</li>
          <li>Customize your widget to match your brand</li>
          <li>Track performance with built-in analytics</li>
          <li>Collaborate with team members</li>
        </ul>
        
        <h3>Next Steps</h3>
        <p>Feel free to edit or delete this sample content and start creating your own amazing articles. If you need help, check out our documentation or contact support.</p>
        
        <p>Happy blogging!</p>
      `,
      excerpt: 'Welcome to your new blog! This sample article will help you get familiar with StorySlip\'s features and capabilities.',
      status: 'published',
      category: 'Getting Started',
      tags: ['welcome', 'tutorial', 'getting-started'],
    },
    {
      title: 'How to Create Engaging Content',
      content: `
        <h2>Tips for Creating Engaging Content</h2>
        <p>Creating content that resonates with your audience is both an art and a science. Here are some proven strategies to help you create more engaging content.</p>
        
        <h3>1. Know Your Audience</h3>
        <p>Understanding who you're writing for is the foundation of great content. Consider their interests, pain points, and what value you can provide.</p>
        
        <h3>2. Start with a Strong Hook</h3>
        <p>Your opening paragraph should grab attention and make readers want to continue. Ask a question, share a surprising fact, or tell a story.</p>
        
        <h3>3. Use Clear Structure</h3>
        <p>Break your content into digestible sections with clear headings. Use bullet points and numbered lists to make information easy to scan.</p>
        
        <h3>4. Include Visuals</h3>
        <p>Images, videos, and infographics can make your content more engaging and help explain complex concepts.</p>
        
        <h3>5. End with a Call to Action</h3>
        <p>Tell your readers what you want them to do next - whether it's leaving a comment, sharing the post, or checking out another article.</p>
      `,
      excerpt: 'Learn proven strategies for creating content that engages your audience and drives meaningful interactions.',
      status: 'published',
      category: 'Content Strategy',
      tags: ['content-creation', 'engagement', 'writing-tips'],
    },
    {
      title: 'Customizing Your Widget Design',
      content: `
        <h2>Make Your Widget Match Your Brand</h2>
        <p>Your content widget is often the first thing visitors see, so it's important to make sure it aligns with your brand identity.</p>
        
        <h3>Color Scheme</h3>
        <p>Choose colors that complement your website's design. Your primary color will be used for buttons, links, and accents throughout the widget.</p>
        
        <h3>Typography</h3>
        <p>The widget will inherit fonts from your website by default, but you can customize typography to ensure consistency with your brand.</p>
        
        <h3>Layout Options</h3>
        <p>StorySlip offers several layout options:</p>
        <ul>
          <li><strong>Grid Layout:</strong> Perfect for showcasing multiple articles</li>
          <li><strong>List Layout:</strong> Great for chronological content display</li>
          <li><strong>Card Layout:</strong> Ideal for featured content with images</li>
        </ul>
        
        <h3>Preview and Test</h3>
        <p>Always preview your widget on different devices to ensure it looks great everywhere. Test the user experience to make sure navigation is intuitive.</p>
      `,
      excerpt: 'Learn how to customize your StorySlip widget to perfectly match your brand and website design.',
      status: 'draft',
      category: 'Customization',
      tags: ['widget', 'design', 'branding', 'customization'],
    },
  ];

  /**
   * Create sample content for a website during onboarding
   */
  static async createSampleContent(
    websiteId: string,
    userId: string
  ): Promise<DatabaseResult<{ created_count: number; content_ids: string[] }>> {
    try {
      const contentIds: string[] = [];
      
      for (const sampleArticle of this.SAMPLE_ARTICLES) {
        // Create the content
        const { data: content, error: contentError } = await supabase
          .from('content')
          .insert({
            website_id: websiteId,
            user_id: userId,
            title: sampleArticle.title,
            content: sampleArticle.content,
            excerpt: sampleArticle.excerpt,
            status: sampleArticle.status,
            published_at: sampleArticle.status === 'published' ? new Date().toISOString() : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (contentError) {
          console.error('Error creating sample content:', contentError);
          continue;
        }

        contentIds.push(content.id);

        // Create category if specified
        if (sampleArticle.category) {
          const { data: existingCategory } = await supabase
            .from('categories')
            .select('id')
            .eq('website_id', websiteId)
            .eq('name', sampleArticle.category)
            .single();

          let categoryId = existingCategory?.id;

          if (!categoryId) {
            const { data: newCategory } = await supabase
              .from('categories')
              .insert({
                website_id: websiteId,
                name: sampleArticle.category,
                slug: sampleArticle.category.toLowerCase().replace(/\s+/g, '-'),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select()
              .single();

            categoryId = newCategory?.id;
          }

          // Associate content with category
          if (categoryId) {
            await supabase
              .from('content')
              .update({ category_id: categoryId })
              .eq('id', content.id);
          }
        }

        // Create tags if specified
        if (sampleArticle.tags && sampleArticle.tags.length > 0) {
          for (const tagName of sampleArticle.tags) {
            // Check if tag exists
            const { data: existingTag } = await supabase
              .from('tags')
              .select('id')
              .eq('website_id', websiteId)
              .eq('name', tagName)
              .single();

            let tagId = existingTag?.id;

            if (!tagId) {
              const { data: newTag } = await supabase
                .from('tags')
                .insert({
                  website_id: websiteId,
                  name: tagName,
                  slug: tagName.toLowerCase().replace(/\s+/g, '-'),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .select()
                .single();

              tagId = newTag?.id;
            }

            // Associate content with tag
            if (tagId) {
              await supabase
                .from('content_tags')
                .insert({
                  content_id: content.id,
                  tag_id: tagId,
                });
            }
          }
        }
      }

      return {
        data: {
          created_count: contentIds.length,
          content_ids: contentIds,
        },
        error: null,
      };
    } catch (error) {
      console.error('Error creating sample content:', error);
      return { data: null, error };
    }
  }

  /**
   * Create sample categories for a website
   */
  static async createSampleCategories(
    websiteId: string
  ): Promise<DatabaseResult<{ created_count: number; category_ids: string[] }>> {
    try {
      const sampleCategories = [
        { name: 'Getting Started', description: 'Introductory content and tutorials' },
        { name: 'Content Strategy', description: 'Tips and strategies for content creation' },
        { name: 'Customization', description: 'Guides for customizing your setup' },
        { name: 'Best Practices', description: 'Industry best practices and recommendations' },
      ];

      const categoryIds: string[] = [];

      for (const category of sampleCategories) {
        const { data, error } = await supabase
          .from('categories')
          .insert({
            website_id: websiteId,
            name: category.name,
            slug: category.name.toLowerCase().replace(/\s+/g, '-'),
            description: category.description,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!error && data) {
          categoryIds.push(data.id);
        }
      }

      return {
        data: {
          created_count: categoryIds.length,
          category_ids: categoryIds,
        },
        error: null,
      };
    } catch (error) {
      console.error('Error creating sample categories:', error);
      return { data: null, error };
    }
  }

  /**
   * Create sample tags for a website
   */
  static async createSampleTags(
    websiteId: string
  ): Promise<DatabaseResult<{ created_count: number; tag_ids: string[] }>> {
    try {
      const sampleTags = [
        'welcome',
        'tutorial',
        'getting-started',
        'content-creation',
        'engagement',
        'writing-tips',
        'widget',
        'design',
        'branding',
        'customization',
        'best-practices',
        'analytics',
      ];

      const tagIds: string[] = [];

      for (const tagName of sampleTags) {
        const { data, error } = await supabase
          .from('tags')
          .insert({
            website_id: websiteId,
            name: tagName,
            slug: tagName.toLowerCase().replace(/\s+/g, '-'),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!error && data) {
          tagIds.push(data.id);
        }
      }

      return {
        data: {
          created_count: tagIds.length,
          tag_ids: tagIds,
        },
        error: null,
      };
    } catch (error) {
      console.error('Error creating sample tags:', error);
      return { data: null, error };
    }
  }
}

export default SampleContentService;
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const blogPosts: Record<string, any> = {
  'getting-started-with-storyslip': {
    title: "Getting Started with StorySlip",
    excerpt: "Learn how to integrate StorySlip into your website in just a few minutes.",
    author: "Sarah Chen",
    authorBio: "Senior Developer Advocate at StorySlip with 8+ years of experience in web development and content management systems.",
    date: "January 15, 2024",
    readTime: "5 min read",
    views: 1234,
    likes: 89,
    comments: 12,
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=400&fit=crop&auto=format&q=80",
    category: "Tutorial",
    tags: ["Getting Started", "Integration", "Tutorial", "Web Development"],
    content: `
      <h2>What is StorySlip?</h2>
      <p>StorySlip is a modern content management system designed to make content publishing effortless for developers and content creators alike. With our powerful widget system, you can integrate dynamic content into any website in minutes, not hours.</p>
      
      <h2>Quick Integration Guide</h2>
      <p>Getting started with StorySlip is incredibly simple. Follow these steps to have your content widget up and running in under 5 minutes:</p>
      
      <h3>Step 1: Get Your API Key</h3>
      <p>First, sign up for a free StorySlip account and navigate to your dashboard. You'll find your unique API key in the "Settings" section. This key is what connects your website to your StorySlip content.</p>
      
      <h3>Step 2: Add the Script</h3>
      <p>Add the StorySlip widget script to your website's HTML. You can place this in your site's head section or just before the closing body tag:</p>
      <pre><code>&lt;script src="https://cdn.storyslip.com/widget.js"&gt;&lt;/script&gt;</code></pre>
      
      <h3>Step 3: Initialize the Widget</h3>
      <p>Now initialize the widget with your API key and configuration options:</p>
      <pre><code>&lt;div id="storyslip-content"&gt;&lt;/div&gt;
&lt;script&gt;
  StorySlip.init({
    apiKey: 'your-api-key-here',
    container: '#storyslip-content',
    theme: 'modern',
    layout: 'grid',
    maxItems: 6
  });
&lt;/script&gt;</code></pre>
      
      <h2>Customization Options</h2>
      <p>StorySlip offers extensive customization options to match your brand and design:</p>
      <ul>
        <li><strong>Themes:</strong> Choose from Modern, Minimal, or Classic themes</li>
        <li><strong>Layouts:</strong> Grid, List, or Card layouts available</li>
        <li><strong>Colors:</strong> Customize colors to match your brand</li>
        <li><strong>Typography:</strong> Control fonts and text styling</li>
        <li><strong>Responsive:</strong> Automatically adapts to all screen sizes</li>
      </ul>
      
      <div class="callout">
        <p>💡 Ready to get started? Sign up for a free StorySlip account and start managing your content like a pro.</p>
      </div>
    `
  },
  'advanced-widget-customization': {
    title: "Advanced Widget Customization",
    excerpt: "Discover powerful customization options to match your brand perfectly.",
    author: "Mike Johnson",
    authorBio: "Lead Frontend Engineer with expertise in React, Vue, and modern web technologies.",
    date: "January 12, 2024",
    readTime: "8 min read",
    views: 892,
    likes: 67,
    comments: 8,
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=400&fit=crop&auto=format&q=80",
    category: "Guide",
    tags: ["Customization", "Styling", "Branding", "Advanced"],
    content: `
      <h2>Advanced Styling Options</h2>
      <p>Take your StorySlip widget to the next level with advanced customization options that give you complete control over the appearance and behavior of your content.</p>
      
      <h2>Custom CSS Integration</h2>
      <p>Override default styles with your own CSS to create a truly unique experience:</p>
      <pre><code>.storyslip-widget {
  --primary-color: #your-brand-color;
  --font-family: 'Your Font', sans-serif;
  --border-radius: 12px;
}</code></pre>
      
      <h2>Dynamic Theming</h2>
      <p>Create themes that adapt to user preferences or time of day:</p>
      <ul>
        <li>Dark mode support with automatic detection</li>
        <li>High contrast mode for accessibility</li>
        <li>Custom color schemes for different sections</li>
        <li>Responsive typography scaling</li>
      </ul>
      
      <h2>Brand Integration</h2>
      <p>Seamlessly integrate your brand identity into the widget design. Use your brand colors, fonts, and styling to create a cohesive experience that feels native to your website.</p>
      
      <h3>Color Customization</h3>
      <p>Define your brand colors and apply them consistently across all widget elements:</p>
      <pre><code>StorySlip.init({
  apiKey: 'your-key',
  theme: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    accent: '#06B6D4',
    background: '#FFFFFF',
    text: '#1F2937'
  }
});</code></pre>
      
      <div class="callout">
        <p>💡 Pro tip: Use CSS custom properties for easy theme switching and better maintainability.</p>
      </div>
    `
  },
  'performance-optimization-tips': {
    title: "Performance Optimization Tips",
    excerpt: "Best practices for lightning-fast content delivery and user experience.",
    author: "Alex Rivera",
    authorBio: "Performance Engineer specializing in web optimization and user experience.",
    date: "January 10, 2024",
    readTime: "6 min read",
    views: 2156,
    likes: 143,
    comments: 24,
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop&auto=format&q=80",
    category: "Performance",
    tags: ["Performance", "Optimization", "Speed", "Best Practices"],
    content: `
      <h2>Optimizing Widget Performance</h2>
      <p>Learn how to maximize the performance of your StorySlip widgets for the best user experience possible. Performance optimization is crucial for user engagement and SEO rankings.</p>
      
      <h2>Lazy Loading Strategies</h2>
      <p>Implement smart loading patterns to reduce initial page load times:</p>
      <pre><code>StorySlip.init({
  apiKey: 'your-key',
  lazyLoad: true,
  threshold: 0.1,
  preloadCount: 3
});</code></pre>
      
      <h2>Image Optimization</h2>
      <p>Images often account for the majority of page weight. Here are key strategies:</p>
      <ul>
        <li>Use WebP format for modern browsers</li>
        <li>Implement responsive images with srcset</li>
        <li>Enable progressive JPEG loading</li>
        <li>Optimize image dimensions for display size</li>
      </ul>
      
      <h2>Caching Best Practices</h2>
      <p>Leverage browser caching and CDN capabilities for faster content delivery. Proper caching can reduce server load and improve user experience significantly.</p>
      
      <h3>CDN Configuration</h3>
      <p>Configure your CDN to cache static assets effectively:</p>
      <pre><code>// Cache-Control headers
Cache-Control: public, max-age=31536000, immutable

// For dynamic content
Cache-Control: public, max-age=300, s-maxage=3600</code></pre>
      
      <h2>Performance Metrics</h2>
      <p>Monitor these key performance indicators:</p>
      <div class="stats-box">
        <h4>Key Performance Stats</h4>
        <ul>
          <li>• 1 second delay = 7% reduction in conversions</li>
          <li>• 53% of users abandon sites that take >3 seconds to load</li>
          <li>• Fast sites rank higher in Google search results</li>
          <li>• Better performance = improved user engagement</li>
        </ul>
      </div>
      
      <div class="callout">
        <p>📊 Monitor your Core Web Vitals to ensure optimal performance across all devices.</p>
      </div>
    `
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;
  const { searchParams } = new URL(request.url);
  const theme = searchParams.get('theme') || 'modern';
  const post = blogPosts[slug];

  if (!post) {
    return new NextResponse('Blog post not found', { status: 404 });
  }

  // Theme configurations for blog content
  const themeStyles = {
    modern: {
      primaryColor: '#3b82f6',
      secondaryColor: '#8b5cf6',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      accentColor: '#06b6d4',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      headerGradient: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
      cardBackground: 'linear-gradient(to bottom right, #ffffff, #f0f9ff)',
      borderColor: '#3b82f6'
    },
    minimal: {
      primaryColor: '#374151',
      secondaryColor: '#9ca3af',
      backgroundColor: '#ffffff',
      textColor: '#111827',
      accentColor: '#6b7280',
      fontFamily: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
      headerGradient: '#f9fafb',
      cardBackground: 'linear-gradient(to bottom, #f9fafb, #ffffff)',
      borderColor: '#374151'
    },
    classic: {
      primaryColor: '#92400e',
      secondaryColor: '#d97706',
      backgroundColor: '#fef7ed',
      textColor: '#451a03',
      accentColor: '#ea580c',
      fontFamily: 'Georgia, "Times New Roman", Times, serif',
      headerGradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
      cardBackground: 'linear-gradient(to bottom right, #fef7ed, #fef3c7)',
      borderColor: '#d97706'
    }
  };

  const currentTheme = themeStyles[theme as keyof typeof themeStyles] || themeStyles.modern;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>${post.title}</title>
    <style>
        body { 
            font-family: ${currentTheme.fontFamily}; 
            line-height: 1.6;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
            background-color: ${currentTheme.backgroundColor};
            color: ${currentTheme.textColor};
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 1.5rem;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        @media (min-width: 640px) {
            .container {
                padding: 2rem;
            }
        }
        @media (min-width: 768px) {
            .container {
                padding: 2.5rem;
            }
        }
        .callout {
            background: ${currentTheme.cardBackground};
            padding: 1.5rem;
            border-radius: ${theme === 'minimal' ? '0' : '0.75rem'};
            border: 2px solid ${currentTheme.borderColor};
            margin: 2rem 0;
            word-wrap: break-word;
        }
        .callout p {
            margin-bottom: 0;
            font-size: 1.0625rem;
            line-height: 1.7;
        }
        @media (min-width: 640px) {
            .callout {
                padding: 2rem;
                margin: 2.5rem 0;
            }
            .callout p {
                font-size: 1.125rem;
            }
        }
        .stats-box {
            background: #faf5ff;
            padding: 1.5rem;
            border-radius: 0.75rem;
            border: 1px solid #e9d5ff;
            margin: 2rem 0;
            word-wrap: break-word;
        }
        @media (min-width: 640px) {
            .stats-box {
                padding: 2rem;
                margin: 2.5rem 0;
            }
        }
        .stats-box h4 {
            color: #7c3aed;
            margin-bottom: 1rem;
            font-weight: 600;
            font-size: 1.125rem;
        }
        .stats-box ul {
            color: #6b46c1;
            font-size: 1rem;
            line-height: 1.7;
            margin-bottom: 0;
        }
        .stats-box li {
            margin-bottom: 0.5rem;
        }
        @media (min-width: 640px) {
            .stats-box ul {
                font-size: 1.0625rem;
            }
        }
        pre {
            background: ${theme === 'modern' ? '#f3f4f6' : theme === 'minimal' ? '#f9fafb' : '#fef3c7'};
            padding: 1.25rem;
            border-radius: ${theme === 'minimal' ? '0' : '0.75rem'};
            overflow-x: auto;
            margin: 1.5rem 0;
            font-size: 0.875rem;
            white-space: pre-wrap;
            word-wrap: break-word;
            line-height: 1.6;
            border: ${theme === 'minimal' ? `1px solid ${currentTheme.borderColor}` : 'none'};
        }
        @media (min-width: 640px) {
            pre {
                padding: 1.5rem;
                font-size: 0.9375rem;
                margin: 2rem 0;
            }
        }
        code {
            color: #374151;
            word-wrap: break-word;
        }
        h1 {
            font-size: 1.875rem;
            font-weight: ${theme === 'minimal' ? '300' : '700'};
            color: ${currentTheme.textColor};
            margin: 1.5rem 0;
            line-height: 1.3;
            word-wrap: break-word;
        }
        @media (min-width: 640px) {
            h1 {
                font-size: 2.25rem;
                line-height: 1.2;
            }
        }
        @media (min-width: 768px) {
            h1 {
                font-size: 2.5rem;
            }
        }
        h2 {
            font-size: 1.5rem;
            font-weight: ${theme === 'minimal' ? '400' : '700'};
            color: ${currentTheme.primaryColor};
            margin: 2rem 0 1rem 0;
            line-height: 1.4;
            word-wrap: break-word;
        }
        @media (min-width: 640px) {
            h2 {
                font-size: 1.75rem;
                margin: 2.5rem 0 1.25rem 0;
            }
        }
        h3 {
            font-size: 1.25rem;
            font-weight: ${theme === 'minimal' ? '400' : '600'};
            color: ${currentTheme.secondaryColor};
            margin: 1.75rem 0 0.75rem 0;
            line-height: 1.4;
            word-wrap: break-word;
        }
        @media (min-width: 640px) {
            h3 {
                font-size: 1.375rem;
                margin: 2rem 0 1rem 0;
            }
        }
        p {
            color: ${currentTheme.textColor};
            margin-bottom: 1.5rem;
            font-size: 1.0625rem;
            line-height: 1.8;
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        @media (min-width: 640px) {
            p {
                font-size: 1.125rem;
                line-height: 1.9;
                margin-bottom: 1.75rem;
            }
        }
        ul, ol {
            color: #374151;
            margin-bottom: 1.5rem;
            padding-left: 1.5rem;
            font-size: 1.0625rem;
            line-height: 1.8;
        }
        @media (min-width: 640px) {
            ul, ol {
                padding-left: 1.75rem;
                font-size: 1.125rem;
                line-height: 1.9;
                margin-bottom: 1.75rem;
            }
        }
        li {
            margin-bottom: 0.75rem;
            word-wrap: break-word;
        }
        .hero-image {
            width: 100%;
            height: 280px;
            object-fit: cover;
            border-radius: 0.75rem;
            margin-bottom: 2rem;
        }
        @media (min-width: 640px) {
            .hero-image {
                height: 320px;
            }
        }
        @media (min-width: 768px) {
            .hero-image {
                height: 360px;
            }
        }
        .meta-info {
            display: flex;
            flex-wrap: wrap;
            gap: 1.25rem;
            font-size: 0.9375rem;
            margin-bottom: 2.5rem;
            padding-bottom: 2rem;
            border-bottom: 1px solid #e5e7eb;
        }
        @media (min-width: 640px) {
            .meta-info {
                gap: 1.5rem;
                font-size: 1rem;
                margin-bottom: 3rem;
            }
        }
        .main-grid {
            display: block;
        }
        .sidebar {
            margin-top: 3rem;
        }
        @media (min-width: 900px) {
            .main-grid {
                display: grid;
                grid-template-columns: 2fr 1fr;
                gap: 3rem;
            }
            .sidebar {
                margin-top: 0;
            }
        }
        .sidebar-box {
            background: #f9fafb;
            padding: 1.5rem;
            border-radius: 0.75rem;
            margin-bottom: 2rem;
        }
        @media (min-width: 640px) {
            .sidebar-box {
                padding: 2rem;
            }
        }
        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        .tag {
            padding: 0.25rem 0.5rem;
            background: #dbeafe;
            color: #1d4ed8;
            border-radius: 9999px;
            font-size: 0.75rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Hero Section -->
        <div style="margin-bottom: 2rem;">
            <img 
                src="${post.image}" 
                alt="${post.title}"
                class="hero-image"
            />
            
            <div style="margin: 1rem 0;">
                <span style="display: inline-block; padding: 0.5rem 1rem; background: #dbeafe; color: #1d4ed8; border-radius: 9999px; font-size: 0.875rem; font-weight: 500;">
                    ${post.category}
                </span>
            </div>

            <h1>${post.title}</h1>
            
            <p style="font-size: 1.125rem; color: #6b7280; margin-bottom: 2rem; line-height: 1.7; font-weight: 400;">
                ${post.excerpt}
            </p>

            <div class="meta-info" style="color: #6b7280;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <svg style="width: 1rem; height: 1rem;" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                    </svg>
                    <span>${post.author}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <svg style="width: 1rem; height: 1rem;" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd" />
                    </svg>
                    <span>${post.date}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <svg style="width: 1rem; height: 1rem;" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                    </svg>
                    <span>${post.readTime}</span>
                </div>
            </div>
        </div>

        <!-- Article Content -->
        <div class="main-grid">
            <div>
                <article style="margin-bottom: 3rem;">
                    ${post.content}
                </article>
            </div>

            <!-- Sidebar -->
            <div class="sidebar">
                <!-- Author Info -->
                <div class="sidebar-box">
                    <h3 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 0.75rem;">
                        About the Author
                    </h3>
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                        <div style="width: 2.5rem; height: 2.5rem; background: linear-gradient(135deg, #3b82f6, #6366f1); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                            <svg style="width: 1.25rem; height: 1.25rem; color: white;" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                            </svg>
                        </div>
                        <div>
                            <div style="font-weight: 500; color: #111827; font-size: 0.875rem;">
                                ${post.author}
                            </div>
                            <div style="font-size: 0.75rem; color: #6b7280;">
                                Developer Advocate
                            </div>
                        </div>
                    </div>
                    <p style="font-size: 0.875rem; color: #6b7280;">
                        ${post.authorBio}
                    </p>
                </div>

                <!-- Tags -->
                <div class="sidebar-box">
                    <h3 style="font-size: 1.125rem; font-weight: 600; color: #111827; margin-bottom: 0.75rem;">
                        Tags
                    </h3>
                    <div class="tags">
                        ${post.tags.map((tag: string) => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      // Allow iframe embedding by not setting X-Frame-Options: DENY
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  });
}
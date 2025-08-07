'use client';

import { motion } from 'framer-motion';
import { 
  Calendar, 
  User, 
  Eye, 
  Heart, 
  MessageCircle, 
  Share2,
  ArrowLeft,
  Clock,
  Tag,
  Palette,
  Settings,
  Code
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const blogPost = {
  title: "Advanced Widget Customization",
  excerpt: "Discover powerful customization options to match your brand perfectly.",
  author: "Mike Johnson",
  authorBio: "UI/UX Designer and Frontend Developer with expertise in design systems and component libraries.",
  date: "January 12, 2024",
  readTime: "8 min read",
  views: 892,
  likes: 67,
  comments: 8,
  image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop&auto=format",
  category: "Guide",
  tags: ["Customization", "Design", "Branding", "CSS", "Themes"]
};

export default function BlogPost() {
  return (
    <div className="min-h-screen bg-white dark:bg-secondary-900">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-16 bg-gradient-to-br from-accent-50 to-primary-50 dark:from-secondary-800 dark:to-secondary-700">
          <div className="container mx-auto container-padding">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="max-w-4xl mx-auto"
            >
              {/* Back Button */}
              <Link 
                href="/#demo"
                className="inline-flex items-center space-x-2 text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mb-8 transition-colors duration-200"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Demo</span>
              </Link>

              {/* Category Badge */}
              <div className="mb-6">
                <span className="inline-flex items-center space-x-1 px-3 py-1 bg-accent-100 dark:bg-accent-900 text-accent-700 dark:text-accent-300 rounded-full text-sm font-medium">
                  <Tag className="h-3 w-3" />
                  <span>{blogPost.category}</span>
                </span>
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-lato text-secondary-900 dark:text-white mb-6">
                {blogPost.title}
              </h1>

              {/* Excerpt */}
              <p className="text-lg text-secondary-600 dark:text-secondary-300 mb-8 max-w-3xl">
                {blogPost.excerpt}
              </p>

              {/* Meta Information */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-secondary-600 dark:text-secondary-400">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>{blogPost.author}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>{blogPost.date}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>{blogPost.readTime}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{blogPost.views}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Heart className="h-4 w-4" />
                    <span>{blogPost.likes}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="h-4 w-4" />
                    <span>{blogPost.comments}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Featured Image */}
        <section className="py-8">
          <div className="container mx-auto container-padding">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="max-w-4xl mx-auto"
            >
              <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src={blogPost.image} 
                  alt={blogPost.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Article Content */}
        <section className="py-8">
          <div className="container mx-auto container-padding">
            <div className="max-w-4xl mx-auto">
              <div className="grid lg:grid-cols-4 gap-12">
                {/* Main Content */}
                <motion.article
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="lg:col-span-3 prose prose-lg dark:prose-invert max-w-none"
                >
                  <h2>Beyond Basic Integration</h2>
                  <p>
                    While getting StorySlip up and running is simple, the real power lies in customization. 
                    This guide will walk you through advanced techniques to make your StorySlip widget 
                    perfectly match your brand and design requirements.
                  </p>

                  <h2>Theme Customization</h2>
                  <p>
                    StorySlip comes with three built-in themes, but you can create your own custom theme 
                    to match your brand perfectly. Here's how to define a custom theme:
                  </p>

                  <pre className="bg-secondary-100 dark:bg-secondary-800 p-4 rounded-lg overflow-x-auto">
                    <code>{`StorySlip.init({
  apiKey: 'your-api-key',
  container: '#storyslip-content',
  theme: {
    name: 'custom',
    colors: {
      primary: '#your-brand-color',
      secondary: '#your-secondary-color',
      background: '#ffffff',
      text: '#333333',
      accent: '#your-accent-color'
    },
    typography: {
      fontFamily: 'Your Brand Font, sans-serif',
      headingWeight: 'bold',
      bodyWeight: 'normal'
    },
    styling: {
      borderRadius: '12px',
      shadow: 'custom-shadow',
      spacing: 'p-6'
    }
  }
});`}</code>
                  </pre>

                  <h2>Advanced Layout Options</h2>
                  <p>
                    Beyond the standard grid, list, and card layouts, you can create completely custom 
                    layouts using our flexible layout system:
                  </p>

                  <h3>Custom Grid Configurations</h3>
                  <p>
                    Control exactly how your content is displayed with custom grid configurations:
                  </p>

                  <pre className="bg-secondary-100 dark:bg-secondary-800 p-4 rounded-lg overflow-x-auto">
                    <code>{`layout: {
  type: 'custom-grid',
  columns: {
    mobile: 1,
    tablet: 2,
    desktop: 3,
    wide: 4
  },
  gap: '1.5rem',
  aspectRatio: '16/9'
}`}</code>
                  </pre>

                  <h3>Masonry Layout</h3>
                  <p>
                    Create Pinterest-style masonry layouts for dynamic content heights:
                  </p>

                  <pre className="bg-secondary-100 dark:bg-secondary-800 p-4 rounded-lg overflow-x-auto">
                    <code>{`layout: {
  type: 'masonry',
  columns: 3,
  gap: '1rem',
  breakpoints: {
    768: 2,
    480: 1
  }
}`}</code>
                  </pre>

                  <h2>Custom CSS Integration</h2>
                  <p>
                    For ultimate control, you can inject custom CSS to override any aspect of the widget's appearance:
                  </p>

                  <pre className="bg-secondary-100 dark:bg-secondary-800 p-4 rounded-lg overflow-x-auto">
                    <code>{`StorySlip.init({
  // ... other options
  customCSS: \`
    .storyslip-card {
      transition: all 0.3s ease;
      border: 2px solid transparent;
    }
    
    .storyslip-card:hover {
      transform: translateY(-4px);
      border-color: var(--primary-color);
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    }
    
    .storyslip-title {
      font-family: 'Your Custom Font', serif;
      line-height: 1.2;
    }
  \`
});`}</code>
                  </pre>

                  <h2>Responsive Design Controls</h2>
                  <p>
                    Fine-tune how your widget behaves across different screen sizes:
                  </p>

                  <pre className="bg-secondary-100 dark:bg-secondary-800 p-4 rounded-lg overflow-x-auto">
                    <code>{`responsive: {
  breakpoints: {
    mobile: 480,
    tablet: 768,
    desktop: 1024,
    wide: 1440
  },
  behavior: {
    mobile: {
      layout: 'list',
      maxItems: 3,
      showExcerpt: false
    },
    tablet: {
      layout: 'grid',
      columns: 2,
      maxItems: 6
    },
    desktop: {
      layout: 'grid',
      columns: 3,
      maxItems: 9
    }
  }
}`}</code>
                  </pre>

                  <h2>Animation and Interactions</h2>
                  <p>
                    Add delightful animations and interactions to enhance user experience:
                  </p>

                  <pre className="bg-secondary-100 dark:bg-secondary-800 p-4 rounded-lg overflow-x-auto">
                    <code>{`animations: {
  entrance: {
    type: 'fadeInUp',
    duration: 600,
    delay: 100,
    stagger: 150
  },
  hover: {
    scale: 1.05,
    duration: 200
  },
  loading: {
    type: 'skeleton',
    shimmer: true
  }
}`}</code>
                  </pre>

                  <h2>Content Filtering and Sorting</h2>
                  <p>
                    Implement advanced content filtering and sorting options:
                  </p>

                  <pre className="bg-secondary-100 dark:bg-secondary-800 p-4 rounded-lg overflow-x-auto">
                    <code>{`filters: {
  categories: ['tutorial', 'guide', 'news'],
  tags: ['beginner', 'advanced'],
  dateRange: {
    start: '2024-01-01',
    end: '2024-12-31'
  },
  sortBy: 'publishDate',
  sortOrder: 'desc'
}`}</code>
                  </pre>

                  <h2>Performance Optimization</h2>
                  <p>
                    Optimize your widget for maximum performance:
                  </p>

                  <ul>
                    <li><strong>Lazy Loading:</strong> Load images and content as needed</li>
                    <li><strong>Caching:</strong> Implement intelligent caching strategies</li>
                    <li><strong>Compression:</strong> Optimize images and assets</li>
                    <li><strong>CDN Integration:</strong> Leverage global content delivery</li>
                  </ul>

                  <h2>Testing Your Customizations</h2>
                  <p>
                    Always test your customizations across different devices and browsers. 
                    Use our built-in preview mode to see changes in real-time:
                  </p>

                  <pre className="bg-secondary-100 dark:bg-secondary-800 p-4 rounded-lg overflow-x-auto">
                    <code>{`StorySlip.preview({
  theme: 'your-custom-theme',
  layout: 'your-custom-layout',
  sampleData: true
});`}</code>
                  </pre>

                  <div className="bg-gradient-to-r from-accent-50 to-primary-50 dark:from-secondary-800 dark:to-secondary-700 p-6 rounded-lg border border-accent-200 dark:border-secondary-600 mt-8">
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                      Need help with customization?
                    </h3>
                    <p className="text-secondary-600 dark:text-secondary-300 mb-4">
                      Our design team is here to help you create the perfect widget for your brand.
                    </p>
                    <Link 
                      href="/contact"
                      className="inline-flex items-center px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors duration-200"
                    >
                      Get Design Help
                    </Link>
                  </div>
                </motion.article>

                {/* Sidebar */}
                <motion.aside
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                  className="lg:col-span-1 space-y-8"
                >
                  {/* Author Info */}
                  <div className="bg-white dark:bg-secondary-800 p-6 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700">
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                      About the Author
                    </h3>
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-primary-500 rounded-full flex items-center justify-center">
                        <Palette className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-secondary-900 dark:text-white">
                          {blogPost.author}
                        </div>
                        <div className="text-sm text-secondary-600 dark:text-secondary-400">
                          UI/UX Designer
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      {blogPost.authorBio}
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="bg-white dark:bg-secondary-800 p-6 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700">
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {blogPost.tags.map((tag, index) => (
                        <span 
                          key={index}
                          className="px-3 py-1 bg-accent-100 dark:bg-accent-900 text-accent-700 dark:text-accent-300 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Share */}
                  <div className="bg-white dark:bg-secondary-800 p-6 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700">
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">
                      Share this post
                    </h3>
                    <button className="flex items-center space-x-2 w-full px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors duration-200">
                      <Share2 className="h-4 w-4" />
                      <span>Share</span>
                    </button>
                  </div>
                </motion.aside>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
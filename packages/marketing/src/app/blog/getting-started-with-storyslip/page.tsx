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
  Tag
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const blogPost = {
  title: "Getting Started with StorySlip",
  excerpt: "Learn how to integrate StorySlip into your website in just a few minutes.",
  author: "Sarah Chen",
  authorBio: "Senior Developer Advocate at StorySlip with 8+ years of experience in web development and content management systems.",
  date: "January 15, 2024",
  readTime: "5 min read",
  views: 1234,
  likes: 89,
  comments: 12,
  image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=400&fit=crop&auto=format",
  category: "Tutorial",
  tags: ["Getting Started", "Integration", "Tutorial", "Web Development"]
};

export default function BlogPost() {
  return (
    <div className="min-h-screen bg-white dark:bg-secondary-900">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-16 bg-gradient-to-br from-primary-50 to-accent-50 dark:from-secondary-800 dark:to-secondary-700">
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
                <span className="inline-flex items-center space-x-1 px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium">
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
                  <h2>What is StorySlip?</h2>
                  <p>
                    StorySlip is a modern content management system designed to make content publishing 
                    effortless for developers and content creators alike. With our powerful widget system, 
                    you can integrate dynamic content into any website in minutes, not hours.
                  </p>

                  <h2>Quick Integration Guide</h2>
                  <p>
                    Getting started with StorySlip is incredibly simple. Follow these steps to have 
                    your content widget up and running in under 5 minutes:
                  </p>

                  <h3>Step 1: Get Your API Key</h3>
                  <p>
                    First, sign up for a free StorySlip account and navigate to your dashboard. 
                    You'll find your unique API key in the "Settings" section. This key is what 
                    connects your website to your StorySlip content.
                  </p>

                  <h3>Step 2: Add the Script</h3>
                  <p>
                    Add the StorySlip widget script to your website's HTML. You can place this 
                    in your site's head section or just before the closing body tag:
                  </p>

                  <pre className="bg-secondary-100 dark:bg-secondary-800 p-4 rounded-lg overflow-x-auto">
                    <code>{`<script src="https://cdn.storyslip.com/widget.js"></script>`}</code>
                  </pre>

                  <h3>Step 3: Initialize the Widget</h3>
                  <p>
                    Now initialize the widget with your API key and configuration options:
                  </p>

                  <pre className="bg-secondary-100 dark:bg-secondary-800 p-4 rounded-lg overflow-x-auto">
                    <code>{`<div id="storyslip-content"></div>
<script>
  StorySlip.init({
    apiKey: 'your-api-key-here',
    container: '#storyslip-content',
    theme: 'modern',
    layout: 'grid',
    maxItems: 6
  });
</script>`}</code>
                  </pre>

                  <h2>Customization Options</h2>
                  <p>
                    StorySlip offers extensive customization options to match your brand and design:
                  </p>

                  <ul>
                    <li><strong>Themes:</strong> Choose from Modern, Minimal, or Classic themes</li>
                    <li><strong>Layouts:</strong> Grid, List, or Card layouts available</li>
                    <li><strong>Colors:</strong> Customize colors to match your brand</li>
                    <li><strong>Typography:</strong> Control fonts and text styling</li>
                    <li><strong>Responsive:</strong> Automatically adapts to all screen sizes</li>
                  </ul>

                  <h2>Best Practices</h2>
                  <p>
                    To get the most out of StorySlip, consider these best practices:
                  </p>

                  <ol>
                    <li>Choose a theme that complements your existing design</li>
                    <li>Optimize your content for mobile viewing</li>
                    <li>Use high-quality images for better engagement</li>
                    <li>Keep your content fresh and updated regularly</li>
                    <li>Monitor analytics to understand your audience</li>
                  </ol>

                  <h2>Next Steps</h2>
                  <p>
                    Now that you have StorySlip integrated, explore our advanced features like 
                    custom styling, content scheduling, and analytics. Check out our other tutorials 
                    for more in-depth guides on maximizing your content management workflow.
                  </p>

                  <div className="bg-gradient-to-r from-primary-50 to-accent-50 dark:from-secondary-800 dark:to-secondary-700 p-6 rounded-lg border border-primary-200 dark:border-secondary-600 mt-8">
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                      Ready to get started?
                    </h3>
                    <p className="text-secondary-600 dark:text-secondary-300 mb-4">
                      Sign up for a free StorySlip account and start managing your content like a pro.
                    </p>
                    <Link 
                      href="/register"
                      className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200"
                    >
                      Start Free Trial
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
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-secondary-900 dark:text-white">
                          {blogPost.author}
                        </div>
                        <div className="text-sm text-secondary-600 dark:text-secondary-400">
                          Developer Advocate
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
                          className="px-3 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full text-sm"
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
                    <button className="flex items-center space-x-2 w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200">
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
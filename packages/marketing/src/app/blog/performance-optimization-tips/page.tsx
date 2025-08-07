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
  Zap,
  TrendingUp,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const blogPost = {
  title: "Performance Optimization Tips",
  excerpt: "Best practices for lightning-fast content delivery and user experience.",
  author: "Alex Rivera",
  authorBio: "Performance Engineer with 10+ years optimizing web applications for scale and speed.",
  date: "January 10, 2024",
  readTime: "12 min read",
  views: 2156,
  likes: 143,
  comments: 24,
  image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&auto=format",
  category: "Performance",
  tags: ["Performance", "Optimization", "Speed", "Best Practices", "Web Vitals"]
};

export default function BlogPost() {
  return (
    <div className="min-h-screen bg-white dark:bg-secondary-900">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative py-16 bg-gradient-to-br from-green-50 to-blue-50 dark:from-secondary-800 dark:to-secondary-700">
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
                <span className="inline-flex items-center space-x-1 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-sm font-medium">
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
                  <h2>Why Performance Matters</h2>
                  <p>
                    In today's fast-paced digital world, performance isn't just a nice-to-have—it's essential. 
                    Users expect lightning-fast experiences, and search engines reward sites that deliver them. 
                    With StorySlip, you can achieve both beautiful content and blazing-fast performance.
                  </p>

                  <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800 my-8">
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Performance Impact Stats
                    </h3>
                    <ul className="text-blue-800 dark:text-blue-200 space-y-1 text-sm">
                      <li>• 1 second delay = 7% reduction in conversions</li>
                      <li>• 53% of users abandon sites that take &gt;3 seconds to load</li>
                      <li>• Fast sites rank higher in Google search results</li>
                      <li>• Better performance = improved user engagement</li>
                    </ul>
                  </div>

                  <h2>Core Web Vitals Optimization</h2>
                  <p>
                    Google's Core Web Vitals are crucial metrics for both user experience and SEO. 
                    Here's how to optimize your StorySlip widget for each vital:
                  </p>

                  <h3>Largest Contentful Paint (LCP)</h3>
                  <p>
                    LCP measures loading performance. To optimize LCP with StorySlip:
                  </p>

                  <pre className="bg-secondary-100 dark:bg-secondary-800 p-4 rounded-lg overflow-x-auto">
                    <code>{`StorySlip.init({
  // ... other options
  performance: {
    preloadImages: true,
    lazyLoading: {
      enabled: true,
      threshold: 0.1,
      rootMargin: '50px'
    },
    imageOptimization: {
      format: 'webp',
      quality: 85,
      sizes: [400, 800, 1200]
    }
  }
});`}</code>
                  </pre>

                  <h3>First Input Delay (FID)</h3>
                  <p>
                    FID measures interactivity. Optimize with these techniques:
                  </p>

                  <pre className="bg-secondary-100 dark:bg-secondary-800 p-4 rounded-lg overflow-x-auto">
                    <code>{`// Defer non-critical JavaScript
StorySlip.init({
  // ... other options
  loading: {
    strategy: 'defer',
    priority: 'low',
    chunkSize: 'small'
  },
  interactions: {
    debounce: 150,
    throttle: 100
  }
});`}</code>
                  </pre>

                  <h3>Cumulative Layout Shift (CLS)</h3>
                  <p>
                    CLS measures visual stability. Prevent layout shifts with:
                  </p>

                  <pre className="bg-secondary-100 dark:bg-secondary-800 p-4 rounded-lg overflow-x-auto">
                    <code>{`// Reserve space for content
.storyslip-container {
  min-height: 400px; /* Reserve space */
}

StorySlip.init({
  // ... other options
  layout: {
    reserveSpace: true,
    placeholderHeight: '200px',
    preventShift: true
  }
});`}</code>
                  </pre>

                  <h2>Advanced Caching Strategies</h2>
                  <p>
                    Implement intelligent caching to dramatically improve load times:
                  </p>

                  <h3>Browser Caching</h3>
                  <pre className="bg-secondary-100 dark:bg-secondary-800 p-4 rounded-lg overflow-x-auto">
                    <code>{`StorySlip.init({
  // ... other options
  cache: {
    strategy: 'stale-while-revalidate',
    maxAge: 3600, // 1 hour
    staleAge: 86400, // 24 hours
    storage: 'localStorage'
  }
});`}</code>
                  </pre>

                  <h3>Service Worker Integration</h3>
                  <pre className="bg-secondary-100 dark:bg-secondary-800 p-4 rounded-lg overflow-x-auto">
                    <code>{`// Register service worker for offline support
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

StorySlip.init({
  // ... other options
  offline: {
    enabled: true,
    fallbackContent: 'cached-content',
    strategy: 'cache-first'
  }
});`}</code>
                  </pre>

                  <h2>Image Optimization</h2>
                  <p>
                    Images often account for the majority of page weight. Optimize them effectively:
                  </p>

                  <h3>Modern Image Formats</h3>
                  <pre className="bg-secondary-100 dark:bg-secondary-800 p-4 rounded-lg overflow-x-auto">
                    <code>{`StorySlip.init({
  // ... other options
  images: {
    formats: ['avif', 'webp', 'jpg'],
    quality: {
      avif: 50,
      webp: 75,
      jpg: 85
    },
    responsive: {
      breakpoints: [400, 800, 1200, 1600],
      sizes: '(max-width: 768px) 100vw, 50vw'
    }
  }
});`}</code>
                  </pre>

                  <h3>Progressive Loading</h3>
                  <pre className="bg-secondary-100 dark:bg-secondary-800 p-4 rounded-lg overflow-x-auto">
                    <code>{`// Implement progressive image loading
StorySlip.init({
  // ... other options
  progressive: {
    enabled: true,
    placeholder: 'blur', // or 'skeleton'
    blurDataURL: 'data:image/jpeg;base64,...',
    fadeInDuration: 300
  }
});`}</code>
                  </pre>

                  <h2>Content Delivery Network (CDN)</h2>
                  <p>
                    Leverage StorySlip's global CDN for optimal content delivery:
                  </p>

                  <pre className="bg-secondary-100 dark:bg-secondary-800 p-4 rounded-lg overflow-x-auto">
                    <code>{`StorySlip.init({
  // ... other options
  cdn: {
    region: 'auto', // or specific region
    compression: 'gzip',
    minify: true,
    bundling: 'optimal'
  }
});`}</code>
                  </pre>

                  <h2>Performance Monitoring</h2>
                  <p>
                    Monitor your widget's performance in real-time:
                  </p>

                  <pre className="bg-secondary-100 dark:bg-secondary-800 p-4 rounded-lg overflow-x-auto">
                    <code>{`StorySlip.init({
  // ... other options
  analytics: {
    performance: true,
    vitals: ['LCP', 'FID', 'CLS'],
    customMetrics: ['loadTime', 'renderTime']
  },
  onPerformanceUpdate: (metrics) => {
    console.log('Performance metrics:', metrics);
    // Send to your analytics service
  }
});`}</code>
                  </pre>

                  <h2>Mobile Optimization</h2>
                  <p>
                    Mobile users expect even faster experiences. Optimize specifically for mobile:
                  </p>

                  <ul>
                    <li><strong>Reduce payload:</strong> Serve smaller images and fewer items on mobile</li>
                    <li><strong>Touch optimization:</strong> Ensure touch targets are at least 44px</li>
                    <li><strong>Network awareness:</strong> Adapt to slow connections</li>
                    <li><strong>Battery efficiency:</strong> Minimize CPU-intensive operations</li>
                  </ul>

                  <pre className="bg-secondary-100 dark:bg-secondary-800 p-4 rounded-lg overflow-x-auto">
                    <code>{`StorySlip.init({
  // ... other options
  mobile: {
    maxItems: 3,
    imageQuality: 70,
    animations: 'reduced',
    touchOptimized: true
  }
});`}</code>
                  </pre>

                  <h2>Performance Testing</h2>
                  <p>
                    Regular performance testing ensures your optimizations are working:
                  </p>

                  <ul>
                    <li><strong>Lighthouse:</strong> Automated performance audits</li>
                    <li><strong>WebPageTest:</strong> Real-world performance testing</li>
                    <li><strong>Chrome DevTools:</strong> Detailed performance profiling</li>
                    <li><strong>Real User Monitoring:</strong> Track actual user experiences</li>
                  </ul>

                  <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800 mt-8">
                    <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center">
                      <Zap className="h-5 w-5 mr-2" />
                      Performance Checklist
                    </h3>
                    <ul className="text-green-800 dark:text-green-200 space-y-1 text-sm">
                      <li>✓ Optimize images with modern formats</li>
                      <li>✓ Implement lazy loading</li>
                      <li>✓ Use browser caching</li>
                      <li>✓ Minimize JavaScript payload</li>
                      <li>✓ Monitor Core Web Vitals</li>
                      <li>✓ Test on real devices</li>
                    </ul>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-secondary-800 dark:to-secondary-700 p-6 rounded-lg border border-green-200 dark:border-secondary-600 mt-8">
                    <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                      Need performance help?
                    </h3>
                    <p className="text-secondary-600 dark:text-secondary-300 mb-4">
                      Our performance team can audit your implementation and provide custom optimization recommendations.
                    </p>
                    <Link 
                      href="/contact"
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                    >
                      Get Performance Audit
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
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                        <Activity className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="font-medium text-secondary-900 dark:text-white">
                          {blogPost.author}
                        </div>
                        <div className="text-sm text-secondary-600 dark:text-secondary-400">
                          Performance Engineer
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
                          className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-sm"
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
                    <button className="flex items-center space-x-2 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200">
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
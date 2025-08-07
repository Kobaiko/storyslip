'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Monitor, 
  Smartphone, 
  Tablet,
  Code,
  Eye,
  Settings,
  Sparkles
} from 'lucide-react';
import { MultiTabCodeDemo } from '@/components/ui/CodeDemo';
import { WidgetPreview } from '@/components/ui/WidgetPreview';
import { IframeBlogViewer } from '@/components/ui/IframeBlogViewer';
import { urls } from '@/config/app';

const demoTabs = [
  {
    title: 'HTML/JavaScript',
    language: 'html',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website</title>
</head>
<body>
    <h1>Welcome to My Website</h1>
    
    <!-- StorySlip Widget Container -->
    <div id="storyslip-content"></div>
    
    <!-- StorySlip Integration -->
    <script src="https://cdn.storyslip.com/widget.js"></script>
    <script>
        StorySlip.init({
            apiKey: 'your-api-key-here',
            container: '#storyslip-content',
            theme: 'modern',
            layout: 'grid',
            maxItems: 6,
            showAuthor: true,
            showDate: true,
            showExcerpt: true
        });
    </script>
</body>
</html>`
  },
  {
    title: 'React',
    language: 'jsx',
    code: `import React from 'react';
import { StorySlipWidget } from '@storyslip/react';

function App() {
  return (
    <div className="App">
      <header>
        <h1>Welcome to My Website</h1>
      </header>
      
      <main>
        <section className="content-section">
          <h2>Latest Stories</h2>
          <StorySlipWidget
            apiKey="your-api-key-here"
            theme="modern"
            layout="grid"
            maxItems={6}
            showAuthor={true}
            showDate={true}
            showExcerpt={true}
            onContentLoad={(content) => {
              console.log('Content loaded:', content);
            }}
            onError={(error) => {
              console.error('Widget error:', error);
            }}
          />
        </section>
      </main>
    </div>
  );
}

export default App;`
  },
  {
    title: 'Vue.js',
    language: 'vue',
    code: `<template>
  <div id="app">
    <header>
      <h1>Welcome to My Website</h1>
    </header>
    
    <main>
      <section class="content-section">
        <h2>Latest Stories</h2>
        <StorySlipWidget
          :api-key="apiKey"
          theme="modern"
          layout="grid"
          :max-items="6"
          :show-author="true"
          :show-date="true"
          :show-excerpt="true"
          @content-load="onContentLoad"
          @error="onError"
        />
      </section>
    </main>
  </div>
</template>

<script>
import { StorySlipWidget } from '@storyslip/vue';

export default {
  name: 'App',
  components: {
    StorySlipWidget
  },
  data() {
    return {
      apiKey: 'your-api-key-here'
    };
  },
  methods: {
    onContentLoad(content) {
      console.log('Content loaded:', content);
    },
    onError(error) {
      console.error('Widget error:', error);
    }
  }
};
</script>`
  },
  {
    title: 'WordPress',
    language: 'php',
    code: `<?php
// Add to your theme's functions.php file

function add_storyslip_widget() {
    // Get API key from WordPress options
    $api_key = get_option('storyslip_api_key');
    
    if (!$api_key) {
        return '<p>Please configure your StorySlip API key in the admin panel.</p>';
    }
    
    $widget_html = '
    <div id="storyslip-widget-' . uniqid() . '"></div>
    <script>
        document.addEventListener("DOMContentLoaded", function() {
            StorySlip.init({
                apiKey: "' . esc_js($api_key) . '",
                container: "#storyslip-widget-' . uniqid() . '",
                theme: "' . get_option('storyslip_theme', 'modern') . '",
                layout: "' . get_option('storyslip_layout', 'grid') . '",
                maxItems: ' . get_option('storyslip_max_items', 6) . ',
                showAuthor: ' . (get_option('storyslip_show_author', true) ? 'true' : 'false') . ',
                showDate: ' . (get_option('storyslip_show_date', true) ? 'true' : 'false') . ',
                showExcerpt: ' . (get_option('storyslip_show_excerpt', true) ? 'true' : 'false') . '
            });
        });
    </script>';
    
    return $widget_html;
}

// Shortcode for easy insertion
add_shortcode('storyslip', 'add_storyslip_widget');

// Widget for sidebar usage
class StorySlip_Widget extends WP_Widget {
    function __construct() {
        parent::__construct(
            'storyslip_widget',
            'StorySlip Content',
            array('description' => 'Display your StorySlip content')
        );
    }
    
    function widget($args, $instance) {
        echo $args['before_widget'];
        echo $args['before_title'] . 'Latest Stories' . $args['after_title'];
        echo add_storyslip_widget();
        echo $args['after_widget'];
    }
}

add_action('widgets_init', function() {
    register_widget('StorySlip_Widget');
});
?>`
  }
];

const deviceSizes = [
  { name: 'Desktop', icon: Monitor, width: '100%', active: true },
  { name: 'Tablet', icon: Tablet, width: '768px', active: false },
  { name: 'Mobile', icon: Smartphone, width: '375px', active: false }
];

export function DemoSection() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const [activeDevice, setActiveDevice] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const [showIframe, setShowIframe] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);

  const handleDeviceChange = (index: number) => {
    setActiveDevice(index);
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const handleOpenIframe = (slug: string, theme: string) => {
    const blogPostUrls: Record<string, string> = {
      'getting-started-with-storyslip': '/api/blog-iframe/getting-started-with-storyslip',
      'advanced-widget-customization': '/api/blog-iframe/advanced-widget-customization',
      'performance-optimization-tips': '/api/blog-iframe/performance-optimization-tips'
    };
    
    const url = blogPostUrls[slug];
    if (url) {
      // Add theme parameter to the URL
      const urlWithTheme = `${url}?theme=${theme}`;
      setIframeUrl(urlWithTheme);
      setShowIframe(true);
    }
  };

  const handleCloseIframe = () => {
    setShowIframe(false);
    setIframeUrl(null);
  };

  return (
    <section id="demo" className="section-padding bg-white dark:bg-secondary-900">
      <div className="container mx-auto container-padding">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center space-x-2 bg-accent-100 dark:bg-accent-900 text-accent-700 dark:text-accent-300 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            <span>Live Demo</span>
          </div>
          
          <h2 className="heading-lg font-lato text-secondary-900 dark:text-white mb-6">
            See StorySlip in action with{' '}
            <span className="gradient-text-accent">live examples</span>
          </h2>
          
          <p className="text-large text-secondary-600 dark:text-secondary-300 max-w-3xl mx-auto">
            Explore our interactive demo to see how easy it is to integrate StorySlip 
            into your website and start managing content like a pro.
          </p>
        </motion.div>

        {/* Demo Controls */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-col lg:flex-row gap-8 mb-12"
        >
          {/* Tab Controls */}
          <div className="flex justify-center lg:justify-start">
            <div className="inline-flex bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors duration-200 ${
                  activeTab === 'preview'
                    ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm'
                    : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'
                }`}
              >
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors duration-200 ${
                  activeTab === 'code'
                    ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm'
                    : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'
                }`}
              >
                <Code className="h-4 w-4" />
                <span>Code</span>
              </button>
            </div>
          </div>

          {/* Device Controls (only show for preview) */}
          {activeTab === 'preview' && (
            <div className="flex justify-center lg:justify-end">
              <div className="inline-flex bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
                {deviceSizes.map((device, index) => (
                  <button
                    key={index}
                    onClick={() => handleDeviceChange(index)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md font-medium transition-colors duration-200 ${
                      activeDevice === index
                        ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-sm'
                        : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'
                    }`}
                  >
                    <device.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{device.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Demo Content */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative"
        >
          {activeTab === 'preview' ? (
            <div className="relative">
              {/* Device Frame */}
              <div className="bg-secondary-100 dark:bg-secondary-800 rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="text-sm text-secondary-600 dark:text-secondary-400 ml-4">
                      demo.storyslip.com
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={togglePlayback}
                      className="flex items-center space-x-1 px-3 py-1 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors duration-200"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-4 w-4" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          <span>Play</span>
                        </>
                      )}
                    </button>
                    <button className="p-1 text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white transition-colors duration-200">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Responsive Preview */}
                <div className="flex justify-center">
                  <motion.div
                    key={activeDevice}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{ 
                      width: deviceSizes[activeDevice].width,
                      maxWidth: '100%'
                    }}
                    className="bg-white dark:bg-secondary-900 rounded-lg shadow-lg overflow-hidden"
                  >
                    <WidgetPreview onPostClick={handleOpenIframe} />
                  </motion.div>
                </div>
              </div>

              {/* Floating Stats */}
              <div className="absolute -top-4 -right-4 bg-white dark:bg-secondary-800 rounded-lg shadow-lg p-4 border border-secondary-200 dark:border-secondary-700">
                <div className="text-sm font-medium text-secondary-900 dark:text-white mb-1">
                  Load Time
                </div>
                <div className="text-2xl font-bold text-green-500">
                  1.2s
                </div>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-white dark:bg-secondary-800 rounded-lg shadow-lg p-4 border border-secondary-200 dark:border-secondary-700">
                <div className="text-sm font-medium text-secondary-900 dark:text-white mb-1">
                  Bundle Size
                </div>
                <div className="text-2xl font-bold text-blue-500">
                  47KB
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <MultiTabCodeDemo tabs={demoTabs} displayOnly={true} />
              
              {/* Integration Steps */}
              <div className="grid md:grid-cols-3 gap-6 mt-8">
                <div className="text-center p-6 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl font-bold text-primary-600 dark:text-primary-400">1</span>
                  </div>
                  <h3 className="font-semibold font-lato text-secondary-900 dark:text-white mb-2">
                    Get Your API Key
                  </h3>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400">
                    Sign up and get your unique API key from the dashboard
                  </p>
                </div>
                
                <div className="text-center p-6 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl font-bold text-primary-600 dark:text-primary-400">2</span>
                  </div>
                  <h3 className="font-semibold font-lato text-secondary-900 dark:text-white mb-2">
                    Add the Code
                  </h3>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400">
                    Copy and paste the integration code into your website
                  </p>
                </div>
                
                <div className="text-center p-6 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-xl font-bold text-primary-600 dark:text-primary-400">3</span>
                  </div>
                  <h3 className="font-semibold font-lato text-secondary-900 dark:text-white mb-2">
                    Start Publishing
                  </h3>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400">
                    Create and publish content through our intuitive dashboard
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="text-center mt-16"
        >
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 bg-gradient-to-r from-primary-50 to-accent-50 dark:from-secondary-800 dark:to-secondary-700 rounded-2xl border border-primary-200 dark:border-secondary-600">
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-bold text-secondary-900 dark:text-white mb-2">
                Ready to try it yourself?
              </h3>
              <p className="text-secondary-600 dark:text-secondary-300">
                Get started with our free trial and see how easy content management can be.
              </p>
            </div>
            <div className="flex-shrink-0 flex gap-3">
              <motion.a
                href={urls.register}
                className="btn-primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Start Free Trial
              </motion.a>
              <motion.a
                href={urls.apiDocs}
                className="btn-outline"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                View Docs
              </motion.a>
            </div>
          </div>
        </motion.div>

        {/* Iframe Blog Viewer */}
        <IframeBlogViewer
          isOpen={showIframe}
          blogUrl={iframeUrl}
          onClose={handleCloseIframe}
          deviceWidth={deviceSizes[activeDevice].width}
        />
      </div>
    </section>
  );
}
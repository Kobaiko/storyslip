'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Eye, 
  Calendar,
  User,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const sampleContent = [
  {
    id: 1,
    title: "Getting Started with StorySlip",
    excerpt: "Learn how to integrate StorySlip into your website in just a few minutes.",
    author: "Sarah Chen",
    date: "2024-01-15",
    views: 1234,
    likes: 89,
    comments: 12,
    image: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=200&fit=crop",
    category: "Tutorial"
  },
  {
    id: 2,
    title: "Advanced Widget Customization",
    excerpt: "Discover powerful customization options to match your brand perfectly.",
    author: "Mike Johnson",
    date: "2024-01-12",
    views: 892,
    likes: 67,
    comments: 8,
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop",
    category: "Guide"
  },
  {
    id: 3,
    title: "Performance Optimization Tips",
    excerpt: "Best practices for lightning-fast content delivery and user experience.",
    author: "Alex Rivera",
    date: "2024-01-10",
    views: 2156,
    likes: 143,
    comments: 24,
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=200&fit=crop",
    category: "Performance"
  }
];

const themes = [
  { name: 'Modern', value: 'modern' },
  { name: 'Minimal', value: 'minimal' },
  { name: 'Classic', value: 'classic' }
];

const layouts = [
  { name: 'Grid', value: 'grid' },
  { name: 'List', value: 'list' },
  { name: 'Cards', value: 'cards' }
];

// Theme configurations with distinct visual styles
const themeConfigs = {
  modern: {
    name: "Modern",
    colors: {
      primary: "#3b82f6",
      secondary: "#8b5cf6", 
      background: "#ffffff",
      text: "#1f2937",
      accent: "#06b6d4",
      cardBg: "from-white to-blue-50",
      border: "border-blue-200"
    },
    typography: {
      fontFamily: "font-display",
      headingWeight: "font-bold",
      bodyWeight: "font-medium"
    },
    styling: {
      borderRadius: "rounded-xl",
      shadow: "shadow-lg hover:shadow-xl",
      spacing: "p-6"
    }
  },
  minimal: {
    name: "Minimal",
    colors: {
      primary: "#64748b",
      secondary: "#94a3b8",
      background: "#f8fafc", 
      text: "#334155",
      accent: "#0f172a",
      cardBg: "from-slate-50 to-white",
      border: "border-slate-200"
    },
    typography: {
      fontFamily: "font-sans",
      headingWeight: "font-medium",
      bodyWeight: "font-normal"
    },
    styling: {
      borderRadius: "rounded-lg",
      shadow: "shadow-sm hover:shadow-md",
      spacing: "p-8"
    }
  },
  classic: {
    name: "Classic", 
    colors: {
      primary: "#1e3a8a",
      secondary: "#f59e0b",
      background: "#fefdf8",
      text: "#1f2937", 
      accent: "#dc2626",
      cardBg: "from-amber-50 to-blue-50",
      border: "border-amber-200"
    },
    typography: {
      fontFamily: "font-lato",
      headingWeight: "font-semibold",
      bodyWeight: "font-normal"
    },
    styling: {
      borderRadius: "rounded-md",
      shadow: "shadow-md hover:shadow-lg",
      spacing: "p-5"
    }
  }
};

export function WidgetPreview() {
  const [currentTheme, setCurrentTheme] = useState('modern');
  const [currentLayout, setCurrentLayout] = useState('grid');
  const [isLoading, setIsLoading] = useState(false);

  const handleThemeChange = (theme: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setCurrentTheme(theme);
      setIsLoading(false);
    }, 300);
  };

  const handleLayoutChange = (layout: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setCurrentLayout(layout);
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="relative">
      {/* Widget Controls */}
      <div className="mb-6 p-3 sm:p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-lg border border-secondary-200 dark:border-secondary-700">
        <div className="flex flex-col gap-4">
          {/* Theme Selector */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Theme
            </label>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {themes.map((theme) => (
                <button
                  key={theme.value}
                  onClick={() => handleThemeChange(theme.value)}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors duration-200 flex-1 sm:flex-none ${
                    currentTheme === theme.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-600'
                  }`}
                >
                  {theme.name}
                </button>
              ))}
            </div>
          </div>

          {/* Layout Selector */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              Layout
            </label>
            <div className="flex flex-wrap gap-1 sm:gap-2">
              {layouts.map((layout) => (
                <button
                  key={layout.value}
                  onClick={() => handleLayoutChange(layout.value)}
                  className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors duration-200 flex-1 sm:flex-none ${
                    currentLayout === layout.value
                      ? 'bg-primary-600 text-white'
                      : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-700 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-600'
                  }`}
                >
                  {layout.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Widget Preview */}
      <div className="relative bg-white dark:bg-secondary-800 rounded-lg shadow-2xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
        {/* Widget Header */}
        <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700 bg-gradient-to-r from-primary-50 to-accent-50 dark:from-secondary-800 dark:to-secondary-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">
                Latest Stories
              </h3>
            </div>
            <div className="text-sm text-secondary-600 dark:text-secondary-400">
              Powered by StorySlip
            </div>
          </div>
        </div>

        {/* Loading Overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white dark:bg-secondary-800 bg-opacity-80 dark:bg-opacity-80 flex items-center justify-center z-10"
            >
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                <span className="text-sm text-secondary-600 dark:text-secondary-400">
                  Updating preview...
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Widget Content */}
        <motion.div
          key={`${currentTheme}-${currentLayout}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="p-3 sm:p-6"
        >
          {currentLayout === 'grid' && (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              {sampleContent.slice(0, 2).map((item, index) => (
                <ContentCard key={item.id} item={item} theme={currentTheme} index={index} />
              ))}
            </div>
          )}

          {currentLayout === 'list' && (
            <div className="space-y-2 sm:space-y-4">
              {sampleContent.map((item, index) => (
                <ContentListItem key={item.id} item={item} theme={currentTheme} index={index} />
              ))}
            </div>
          )}

          {currentLayout === 'cards' && (
            <div className="space-y-4 sm:space-y-6">
              {sampleContent.slice(0, 2).map((item, index) => (
                <ContentCardLarge key={item.id} item={item} theme={currentTheme} index={index} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Widget Footer */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800">
          <div className="flex items-center justify-between">
            <div className="text-xs sm:text-sm text-secondary-600 dark:text-secondary-400">
              <span className="hidden sm:inline">Showing 3 of 24 stories</span>
              <span className="sm:hidden">3 of 24</span>
            </div>
            <button className="flex items-center space-x-1 text-xs sm:text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors duration-200">
              <span>View all</span>
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentCard({ item, theme, index }: { item: any; theme: string; index: number }) {
  const config = themeConfigs[theme as keyof typeof themeConfigs];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`group cursor-pointer transition-all duration-300 bg-gradient-to-br ${config.colors.cardBg} ${config.styling.borderRadius} ${config.styling.shadow} border ${config.colors.border} ${config.typography.fontFamily}`}
      style={{ 
        backgroundColor: config.colors.background,
        borderColor: config.colors.primary + '20'
      }}
    >
      <div className={`aspect-video bg-secondary-200 dark:bg-secondary-700 ${config.styling.borderRadius.replace('rounded-', 'rounded-t-')} overflow-hidden`}>
        <div 
          className="w-full h-full flex items-center justify-center"
          style={{ 
            background: `linear-gradient(135deg, ${config.colors.primary}, ${config.colors.accent})`
          }}
        >
          <span className={`text-white ${config.typography.bodyWeight} text-sm`}>{item.category}</span>
        </div>
      </div>
      <div className="p-3 sm:p-4">
        <h4 className={`${config.typography.headingWeight} text-xs sm:text-sm mb-2 group-hover:transition-colors duration-200 line-clamp-2`}
            style={{ color: config.colors.text }}
            onMouseEnter={(e) => e.currentTarget.style.color = config.colors.primary}
            onMouseLeave={(e) => e.currentTarget.style.color = config.colors.text}>
          {item.title}
        </h4>
        <p className={`text-xs mb-3 line-clamp-2 ${config.typography.bodyWeight} hidden sm:block`}
           style={{ color: config.colors.text + '99' }}>
          {item.excerpt}
        </p>
        <div className={`flex items-center justify-between text-xs ${config.typography.bodyWeight}`}
             style={{ color: config.colors.text + '80' }}>
          <div className="flex items-center space-x-1 truncate mr-2">
            <User className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{item.author}</span>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            <div className="flex items-center space-x-1">
              <Eye className="h-3 w-3" />
              <span className="hidden sm:inline">{item.views}</span>
              <span className="sm:hidden">{Math.floor(item.views/1000)}k</span>
            </div>
            <div className="flex items-center space-x-1">
              <Heart className="h-3 w-3" />
              <span>{item.likes}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ContentListItem({ item, theme, index }: { item: any; theme: string; index: number }) {
  const config = themeConfigs[theme as keyof typeof themeConfigs];
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`group cursor-pointer flex space-x-2 sm:space-x-4 transition-all duration-200 bg-gradient-to-r ${config.colors.cardBg} ${config.styling.borderRadius} ${config.styling.shadow} border p-3 sm:p-4 ${config.typography.fontFamily}`}
      style={{ 
        backgroundColor: config.colors.background,
        borderColor: config.colors.primary + '30'
      }}
    >
      <div 
        className={`w-12 h-12 sm:w-16 sm:h-16 ${config.styling.borderRadius} flex-shrink-0 flex items-center justify-center`}
        style={{ 
          background: `linear-gradient(135deg, ${config.colors.primary}, ${config.colors.accent})`
        }}
      >
        <span className={`text-white ${config.typography.bodyWeight} text-xs`}>{item.category}</span>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className={`${config.typography.headingWeight} text-xs sm:text-sm mb-1 group-hover:transition-colors duration-200 truncate`}
            style={{ color: config.colors.text }}
            onMouseEnter={(e) => e.currentTarget.style.color = config.colors.primary}
            onMouseLeave={(e) => e.currentTarget.style.color = config.colors.text}>
          {item.title}
        </h4>
        <p className={`text-xs mb-2 line-clamp-1 ${config.typography.bodyWeight} hidden sm:block`}
           style={{ color: config.colors.text + '99' }}>
          {item.excerpt}
        </p>
        <div className={`flex items-center justify-between text-xs ${config.typography.bodyWeight}`}
             style={{ color: config.colors.text + '80' }}>
          <span className="truncate mr-2">{item.author}</span>
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            <span className="hidden sm:inline">{item.views} views</span>
            <span className="sm:hidden">{item.views}</span>
            <span className="hidden sm:inline">{item.likes} likes</span>
            <span className="sm:hidden">♥{item.likes}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ContentCardLarge({ item, theme, index }: { item: any; theme: string; index: number }) {
  const config = themeConfigs[theme as keyof typeof themeConfigs];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`group cursor-pointer transition-all duration-200 bg-gradient-to-br ${config.colors.cardBg} ${config.styling.borderRadius} ${config.styling.shadow} border ${config.typography.fontFamily}`}
      style={{ 
        backgroundColor: config.colors.background,
        borderColor: config.colors.primary + '40'
      }}
    >
      <div className={`aspect-[2/1] ${config.styling.borderRadius.replace('rounded-', 'rounded-t-')} overflow-hidden`}>
        <div 
          className="w-full h-full flex items-center justify-center"
          style={{ 
            background: `linear-gradient(135deg, ${config.colors.primary}, ${config.colors.accent})`
          }}
        >
          <span className={`text-white ${config.typography.bodyWeight}`}>{item.category}</span>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        <div className="flex items-center space-x-2 mb-3">
          <span 
            className={`px-2 py-1 text-xs ${config.typography.bodyWeight} rounded`}
            style={{ 
              backgroundColor: config.colors.primary + '20',
              color: config.colors.primary
            }}
          >
            {item.category}
          </span>
          <span className={`text-xs ${config.typography.bodyWeight} hidden sm:inline`}
                style={{ color: config.colors.text + '80' }}>
            {item.date}
          </span>
        </div>
        <h4 className={`${config.typography.headingWeight} text-sm sm:text-lg mb-3 group-hover:transition-colors duration-200 line-clamp-2`}
            style={{ color: config.colors.text }}
            onMouseEnter={(e) => e.currentTarget.style.color = config.colors.primary}
            onMouseLeave={(e) => e.currentTarget.style.color = config.colors.text}>
          {item.title}
        </h4>
        <p className={`text-xs sm:text-sm mb-4 ${config.typography.bodyWeight} line-clamp-2 sm:line-clamp-3`}
           style={{ color: config.colors.text + '99' }}>
          {item.excerpt}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 truncate mr-2">
            <div 
              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ 
                background: `linear-gradient(135deg, ${config.colors.primary}, ${config.colors.accent})`
              }}
            >
              <User className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
            </div>
            <span className={`text-xs sm:text-sm ${config.typography.bodyWeight} truncate`}
                  style={{ color: config.colors.text }}>
              {item.author}
            </span>
          </div>
          <div className={`flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm ${config.typography.bodyWeight} flex-shrink-0`}
               style={{ color: config.colors.text + '80' }}>
            <div className="flex items-center space-x-1">
              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{item.views}</span>
              <span className="sm:hidden">{Math.floor(item.views/1000)}k</span>
            </div>
            <div className="flex items-center space-x-1">
              <Heart className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>{item.likes}</span>
            </div>
            <div className="flex items-center space-x-1 hidden sm:flex">
              <MessageCircle className="h-4 w-4" />
              <span>{item.comments}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
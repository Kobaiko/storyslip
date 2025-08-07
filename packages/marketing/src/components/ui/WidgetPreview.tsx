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
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=200&fit=crop&auto=format&q=80",
    category: "Tutorial",
    slug: "getting-started-with-storyslip"
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
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=200&fit=crop&auto=format&q=80",
    category: "Guide",
    slug: "advanced-widget-customization"
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
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=200&fit=crop&auto=format&q=80",
    category: "Performance",
    slug: "performance-optimization-tips"
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
      cardBg: "from-white via-blue-50 to-purple-50",
      border: "border-blue-300"
    },
    typography: {
      fontFamily: "font-display",
      headingWeight: "font-bold",
      bodyWeight: "font-medium"
    },
    styling: {
      borderRadius: "rounded-2xl",
      shadow: "shadow-xl hover:shadow-2xl",
      spacing: "p-6",
      special: "bg-gradient-to-br from-blue-500 to-purple-600"
    }
  },
  minimal: {
    name: "Minimal",
    colors: {
      primary: "#374151",
      secondary: "#9ca3af",
      background: "#ffffff", 
      text: "#111827",
      accent: "#6b7280",
      cardBg: "from-gray-50 to-white",
      border: "border-gray-300"
    },
    typography: {
      fontFamily: "font-mono",
      headingWeight: "font-light",
      bodyWeight: "font-light"
    },
    styling: {
      borderRadius: "rounded-none",
      shadow: "shadow-none hover:shadow-sm",
      spacing: "p-8",
      special: "bg-gray-100"
    }
  },
  classic: {
    name: "Classic", 
    colors: {
      primary: "#92400e",
      secondary: "#d97706",
      background: "#fef7ed",
      text: "#451a03", 
      accent: "#ea580c",
      cardBg: "from-amber-100 via-orange-50 to-yellow-50",
      border: "border-amber-400"
    },
    typography: {
      fontFamily: "font-serif",
      headingWeight: "font-bold",
      bodyWeight: "font-normal"
    },
    styling: {
      borderRadius: "rounded-lg",
      shadow: "shadow-lg hover:shadow-xl",
      spacing: "p-6",
      special: "bg-gradient-to-r from-amber-200 to-orange-200"
    }
  }
};

interface WidgetPreviewProps {
  onPostClick?: (slug: string, theme: string) => void;
}

export function WidgetPreview({ onPostClick }: WidgetPreviewProps) {
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

  const handlePostClick = (slug: string) => {
    if (onPostClick) {
      onPostClick(slug, currentTheme);
    }
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
        <div 
          className={`px-6 py-4 border-b ${themeConfigs[currentTheme as keyof typeof themeConfigs].colors.border} ${themeConfigs[currentTheme as keyof typeof themeConfigs].typography.fontFamily}`}
          style={{ 
            background: currentTheme === 'modern' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' :
                       currentTheme === 'minimal' ? '#f9fafb' :
                       'linear-gradient(135deg, #d97706, #f59e0b)'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles 
                className="h-5 w-5" 
                style={{ 
                  color: currentTheme === 'modern' ? 'white' :
                         currentTheme === 'minimal' ? '#374151' :
                         'white'
                }}
              />
              <h3 
                className={`text-lg ${themeConfigs[currentTheme as keyof typeof themeConfigs].typography.headingWeight}`}
                style={{ 
                  color: currentTheme === 'modern' ? 'white' :
                         currentTheme === 'minimal' ? '#111827' :
                         'white'
                }}
              >
                {currentTheme === 'modern' ? 'Latest Stories' :
                 currentTheme === 'minimal' ? 'Recent Articles' :
                 'Featured Content'}
              </h3>
            </div>
            <div 
              className={`text-sm ${themeConfigs[currentTheme as keyof typeof themeConfigs].typography.bodyWeight}`}
              style={{ 
                color: currentTheme === 'modern' ? 'rgba(255,255,255,0.8)' :
                       currentTheme === 'minimal' ? '#6b7280' :
                       'rgba(255,255,255,0.9)'
              }}
            >
              {currentTheme === 'modern' ? 'Powered by StorySlip' :
               currentTheme === 'minimal' ? 'StorySlip' :
               'By StorySlip'}
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
                <ContentCard key={item.id} item={item} theme={currentTheme} index={index} onPostClick={handlePostClick} />
              ))}
            </div>
          )}

          {currentLayout === 'list' && (
            <div className="space-y-2 sm:space-y-4">
              {sampleContent.map((item, index) => (
                <ContentListItem key={item.id} item={item} theme={currentTheme} index={index} onPostClick={handlePostClick} />
              ))}
            </div>
          )}

          {currentLayout === 'cards' && (
            <div className="space-y-4 sm:space-y-6">
              {sampleContent.slice(0, 2).map((item, index) => (
                <ContentCardLarge key={item.id} item={item} theme={currentTheme} index={index} onPostClick={handlePostClick} />
              ))}
            </div>
          )}
        </motion.div>

        {/* Widget Footer */}
        <div 
          className={`px-3 sm:px-6 py-3 sm:py-4 border-t ${themeConfigs[currentTheme as keyof typeof themeConfigs].colors.border} ${themeConfigs[currentTheme as keyof typeof themeConfigs].typography.fontFamily}`}
          style={{ 
            backgroundColor: currentTheme === 'modern' ? '#f8fafc' :
                            currentTheme === 'minimal' ? '#ffffff' :
                            '#fef7ed'
          }}
        >
          <div className="flex items-center justify-between">
            <div 
              className={`text-xs sm:text-sm ${themeConfigs[currentTheme as keyof typeof themeConfigs].typography.bodyWeight}`}
              style={{ 
                color: themeConfigs[currentTheme as keyof typeof themeConfigs].colors.text + '80'
              }}
            >
              <span className="hidden sm:inline">
                {currentTheme === 'modern' ? 'Showing 3 of 24 stories' :
                 currentTheme === 'minimal' ? '3 / 24 articles' :
                 'Displaying 3 of 24 items'}
              </span>
              <span className="sm:hidden">3 of 24</span>
            </div>
            <button 
              className={`flex items-center space-x-1 text-xs sm:text-sm ${themeConfigs[currentTheme as keyof typeof themeConfigs].typography.bodyWeight} transition-colors duration-200`}
              style={{ 
                color: themeConfigs[currentTheme as keyof typeof themeConfigs].colors.primary
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = themeConfigs[currentTheme as keyof typeof themeConfigs].colors.accent}
              onMouseLeave={(e) => e.currentTarget.style.color = themeConfigs[currentTheme as keyof typeof themeConfigs].colors.primary}
            >
              <span>
                {currentTheme === 'modern' ? 'View all' :
                 currentTheme === 'minimal' ? 'More' :
                 'See more'}
              </span>
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

function ContentCard({ item, theme, index, onPostClick }: { item: any; theme: string; index: number; onPostClick: (slug: string, theme: string) => void }) {
  const config = themeConfigs[theme as keyof typeof themeConfigs];
  
  const handleClick = () => {
    onPostClick(item.slug, theme);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onClick={handleClick}
      className={`group cursor-pointer transition-all duration-300 bg-gradient-to-br ${config.colors.cardBg} ${config.styling.borderRadius} ${config.styling.shadow} border ${config.colors.border} ${config.typography.fontFamily} hover:scale-105`}
      style={{ 
        backgroundColor: config.colors.background,
        borderColor: config.colors.primary + '20'
      }}
    >
      <div className={`aspect-video bg-secondary-200 dark:bg-secondary-700 ${config.styling.borderRadius.replace('rounded-', 'rounded-t-')} overflow-hidden relative`}>
        <img 
          src={item.image} 
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <div className="absolute top-2 left-2">
          <span 
            className={`px-2 py-1 text-xs ${config.typography.bodyWeight} ${config.styling.borderRadius.replace('rounded-', 'rounded-')} backdrop-blur-sm`}
            style={{ 
              backgroundColor: theme === 'modern' ? config.colors.primary + 'DD' :
                              theme === 'minimal' ? config.colors.text + 'EE' :
                              config.colors.secondary + 'DD',
              color: theme === 'minimal' ? config.colors.text : 'white',
              border: theme === 'minimal' ? `1px solid ${config.colors.primary}` : 'none'
            }}
          >
            {item.category}
          </span>
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

function ContentListItem({ item, theme, index, onPostClick }: { item: any; theme: string; index: number; onPostClick: (slug: string, theme: string) => void }) {
  const config = themeConfigs[theme as keyof typeof themeConfigs];
  
  const handleClick = () => {
    onPostClick(item.slug, theme);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onClick={handleClick}
      className={`group cursor-pointer flex space-x-2 sm:space-x-4 transition-all duration-200 bg-gradient-to-r ${config.colors.cardBg} ${config.styling.borderRadius} ${config.styling.shadow} border p-3 sm:p-4 ${config.typography.fontFamily} hover:scale-102`}
      style={{ 
        backgroundColor: config.colors.background,
        borderColor: config.colors.primary + '30'
      }}
    >
      <div 
        className={`w-12 h-12 sm:w-16 sm:h-16 ${config.styling.borderRadius} flex-shrink-0 overflow-hidden relative`}
      >
        <img 
          src={item.image} 
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
          <span className={`text-white ${config.typography.bodyWeight} text-xs`}>{item.category}</span>
        </div>
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

function ContentCardLarge({ item, theme, index, onPostClick }: { item: any; theme: string; index: number; onPostClick: (slug: string, theme: string) => void }) {
  const config = themeConfigs[theme as keyof typeof themeConfigs];
  
  const handleClick = () => {
    onPostClick(item.slug, theme);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      onClick={handleClick}
      className={`group cursor-pointer transition-all duration-200 bg-gradient-to-br ${config.colors.cardBg} ${config.styling.borderRadius} ${config.styling.shadow} border ${config.typography.fontFamily} hover:scale-105`}
      style={{ 
        backgroundColor: config.colors.background,
        borderColor: config.colors.primary + '40'
      }}
    >
      <div className={`aspect-[2/1] ${config.styling.borderRadius.replace('rounded-', 'rounded-t-')} overflow-hidden relative`}>
        <img 
          src={item.image} 
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
        <div className="absolute top-4 left-4">
          <span 
            className={`px-3 py-1 text-xs ${config.typography.bodyWeight} ${config.styling.borderRadius} backdrop-blur-sm`}
            style={{ 
              backgroundColor: theme === 'modern' ? config.colors.primary + 'DD' :
                              theme === 'minimal' ? config.colors.background + 'EE' :
                              config.colors.secondary + 'DD',
              color: theme === 'minimal' ? config.colors.text : 'white',
              border: theme === 'minimal' ? `1px solid ${config.colors.primary}` : 'none'
            }}
          >
            {item.category}
          </span>
        </div>
      </div>
      <div className="p-4 sm:p-6">
        <div className="flex items-center space-x-2 mb-3">
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
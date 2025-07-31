'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { Copy, Check, Play } from 'lucide-react';

interface CodeDemoProps {
  title: string;
  language: string;
  code: string;
  showLineNumbers?: boolean;
  showCopyButton?: boolean;
  showRunButton?: boolean;
  onRun?: () => void;
  displayOnly?: boolean;
}

export function CodeDemo({ 
  title, 
  language, 
  code, 
  showLineNumbers = true,
  showCopyButton = true,
  showRunButton = false,
  onRun,
  displayOnly = false
}: CodeDemoProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleRun = () => {
    if (onRun) {
      onRun();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-secondary-900 rounded-lg overflow-hidden shadow-2xl border border-secondary-700"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-secondary-800 border-b border-secondary-700">
        <div className="flex items-center space-x-3">
          {/* Traffic Light Buttons */}
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          
          {/* Title */}
          <span className="text-sm font-medium text-secondary-300">
            {title}
          </span>
          
          {/* Language Badge */}
          <span className="px-2 py-1 text-xs font-medium bg-primary-600 text-white rounded">
            {language.toUpperCase()}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {displayOnly && (
            <div className="flex items-center space-x-1 px-3 py-1 text-xs font-medium text-yellow-400 bg-yellow-400/10 rounded">
              <span>Demo Only - Not for Production</span>
            </div>
          )}
          
          {!displayOnly && showRunButton && (
            <motion.button
              onClick={handleRun}
              className="flex items-center space-x-1 px-3 py-1 text-xs font-medium text-green-400 hover:text-green-300 hover:bg-secondary-700 rounded transition-colors duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play className="h-3 w-3" />
              <span>Run</span>
            </motion.button>
          )}
          
          {!displayOnly && showCopyButton && (
            <motion.button
              onClick={handleCopy}
              className="flex items-center space-x-1 px-3 py-1 text-xs font-medium text-secondary-400 hover:text-secondary-300 hover:bg-secondary-700 rounded transition-colors duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-green-400" />
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>

      {/* Code Content */}
      <div className={`relative ${displayOnly ? 'select-none pointer-events-none' : ''}`}>
        <SyntaxHighlighter
          language={language}
          style={oneDark}
          showLineNumbers={showLineNumbers}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '0.875rem',
            lineHeight: '1.5',
            userSelect: displayOnly ? 'none' : 'text',
            pointerEvents: displayOnly ? 'none' : 'auto'
          }}
          lineNumberStyle={{
            color: '#6b7280',
            fontSize: '0.75rem',
            paddingRight: '1rem',
            userSelect: 'none'
          }}
        >
          {code}
        </SyntaxHighlighter>

        {/* Gradient Overlay for Long Code */}
        {code.split('\n').length > 15 && (
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-secondary-900 to-transparent pointer-events-none" />
        )}
      </div>
    </motion.div>
  );
}

// Inline code component for smaller snippets
export function InlineCode({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <code className={`px-2 py-1 text-sm font-mono bg-secondary-100 dark:bg-secondary-800 text-primary-600 dark:text-primary-400 rounded ${className}`}>
      {children}
    </code>
  );
}

// Multi-tab code demo
interface CodeTab {
  title: string;
  language: string;
  code: string;
}

interface MultiTabCodeDemoProps {
  tabs: CodeTab[];
  defaultTab?: number;
  displayOnly?: boolean;
}

export function MultiTabCodeDemo({ tabs, defaultTab = 0, displayOnly = false }: MultiTabCodeDemoProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <div className="bg-secondary-900 rounded-lg overflow-hidden shadow-2xl border border-secondary-700">
      {/* Tab Headers */}
      <div className="flex items-center bg-secondary-800 border-b border-secondary-700">
        <div className="flex items-center space-x-3 px-4 py-3">
          <div className="flex space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
        </div>
        
        <div className="flex">
          {tabs.map((tab, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`px-4 py-3 text-sm font-medium transition-colors duration-200 border-r border-secondary-700 ${
                activeTab === index
                  ? 'text-white bg-secondary-700'
                  : 'text-secondary-400 hover:text-secondary-300 hover:bg-secondary-750'
              }`}
            >
              {tab.title}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <SyntaxHighlighter
          language={tabs[activeTab].language}
          style={oneDark}
          showLineNumbers={true}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '0.875rem',
            lineHeight: '1.5',
            userSelect: displayOnly ? 'none' : 'text',
            pointerEvents: displayOnly ? 'none' : 'auto'
          }}
          lineNumberStyle={{
            color: '#6b7280',
            fontSize: '0.75rem',
            paddingRight: '1rem',
            userSelect: 'none'
          }}
        >
          {tabs[activeTab].code}
        </SyntaxHighlighter>
      </motion.div>
    </div>
  );
}
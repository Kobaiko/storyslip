'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ArrowLeft,
  AlertCircle,
  RotateCcw,
  Loader2
} from 'lucide-react';

interface IframeBlogViewerProps {
  isOpen: boolean;
  blogUrl: string | null;
  onClose: () => void;
  deviceWidth: string;
}



export function IframeBlogViewer({ isOpen, blogUrl, onClose, deviceWidth }: IframeBlogViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadTimeout, setLoadTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen && blogUrl) {
      setIsLoading(true);
      setError(null);
      
      // Set a timeout for iframe loading
      const timeout = setTimeout(() => {
        setIsLoading(false);
        setError('Content failed to load. Please try again.');
      }, 10000);
      
      setLoadTimeout(timeout);
    }

    return () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
    };
  }, [isOpen, blogUrl]);

  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
    if (loadTimeout) {
      clearTimeout(loadTimeout);
    }
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError('Failed to load blog post. Please check your connection and try again.');
    if (loadTimeout) {
      clearTimeout(loadTimeout);
    }
  };

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    
    // Force iframe reload by changing src
    const iframe = document.querySelector('#blog-iframe') as HTMLIFrameElement;
    if (iframe && blogUrl) {
      iframe.src = blogUrl + '?retry=' + Date.now();
    }
  };

  const handleClose = () => {
    setIsLoading(true);
    setError(null);
    if (loadTimeout) {
      clearTimeout(loadTimeout);
    }
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !blogUrl) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-2 sm:p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-secondary-900 rounded-2xl shadow-2xl w-full max-h-[95vh] overflow-hidden"
          style={{ 
            maxWidth: deviceWidth === '375px' ? '375px' :
                     deviceWidth === '768px' ? '768px' : 
                     '1200px',
            width: deviceWidth === '375px' ? '375px' :
                   deviceWidth === '768px' ? '768px' :
                   '1200px',
            maxHeight: '95vh'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-secondary-900 border-b border-secondary-200 dark:border-secondary-700 p-3 sm:p-4 md:p-6 flex items-center justify-between z-10 flex-shrink-0">
            <button
              onClick={handleClose}
              className="flex items-center space-x-2 text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Demo</span>
              <span className="sm:hidden">Back</span>
            </button>
            
            {error && (
              <button
                onClick={handleRetry}
                className="flex items-center space-x-2 px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Retry</span>
              </button>
            )}
            
            <button
              onClick={handleClose}
              className="p-2 text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white transition-colors duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div 
            className="relative flex-1 overflow-hidden" 
            style={{ 
              height: deviceWidth === '375px' ? 'calc(95vh - 60px)' : 'calc(95vh - 80px)',
              minHeight: '300px'
            }}
          >
            {/* Loading State */}
            {isLoading && (
              <div className="absolute inset-0 bg-white dark:bg-secondary-900 flex items-center justify-center z-20">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
                  <p className="text-secondary-600 dark:text-secondary-400">Loading blog post...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="absolute inset-0 bg-white dark:bg-secondary-900 flex items-center justify-center z-20">
                <div className="text-center max-w-md mx-auto p-6">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-2">
                    Unable to Load Content
                  </h3>
                  <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                    {error}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={handleRetry}
                      className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors duration-200"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Try Again</span>
                    </button>
                    <button
                      onClick={() => window.open(blogUrl, '_blank')}
                      className="px-4 py-2 border border-secondary-300 dark:border-secondary-600 text-secondary-700 dark:text-secondary-300 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-800 transition-colors duration-200"
                    >
                      Open in New Tab
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Iframe */}
            <iframe
              id="blog-iframe"
              src={blogUrl}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              referrerPolicy="strict-origin-when-cross-origin"
              loading="lazy"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              title="Blog Post Content"
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
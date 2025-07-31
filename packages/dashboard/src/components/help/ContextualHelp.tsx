import React, { useState, useEffect, useRef } from 'react';
import { 
  HelpCircle, 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Play, 
  Pause,
  RotateCcw,
  CheckCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface TooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click';
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({ 
  content, 
  position = 'top', 
  trigger = 'hover', 
  children, 
  className = '' 
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current;
      const trigger = triggerRef.current;
      const rect = trigger.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      
      // Check if tooltip would go off screen and adjust position
      let newPosition = position;
      
      if (position === 'top' && rect.top - tooltipRect.height < 10) {
        newPosition = 'bottom';
      } else if (position === 'bottom' && rect.bottom + tooltipRect.height > window.innerHeight - 10) {
        newPosition = 'top';
      } else if (position === 'left' && rect.left - tooltipRect.width < 10) {
        newPosition = 'right';
      } else if (position === 'right' && rect.right + tooltipRect.width > window.innerWidth - 10) {
        newPosition = 'left';
      }
      
      setActualPosition(newPosition);
    }
  }, [isVisible, position]);

  const getPositionClasses = () => {
    const baseClasses = 'absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap';
    
    switch (actualPosition) {
      case 'top':
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
      case 'bottom':
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`;
      case 'left':
        return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 mr-2`;
      case 'right':
        return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 ml-2`;
      default:
        return baseClasses;
    }
  };

  const getArrowClasses = () => {
    const baseClasses = 'absolute w-2 h-2 bg-gray-900 transform rotate-45';
    
    switch (actualPosition) {
      case 'top':
        return `${baseClasses} top-full left-1/2 -translate-x-1/2 -mt-1`;
      case 'bottom':
        return `${baseClasses} bottom-full left-1/2 -translate-x-1/2 -mb-1`;
      case 'left':
        return `${baseClasses} left-full top-1/2 -translate-y-1/2 -ml-1`;
      case 'right':
        return `${baseClasses} right-full top-1/2 -translate-y-1/2 -mr-1`;
      default:
        return baseClasses;
    }
  };

  const handleMouseEnter = () => {
    if (trigger === 'hover') {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsVisible(false);
    }
  };

  const handleClick = () => {
    if (trigger === 'click') {
      setIsVisible(!isVisible);
    }
  };

  return (
    <div 
      ref={triggerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {children}
      
      {isVisible && (
        <div ref={tooltipRef} className={getPositionClasses()}>
          {content}
          <div className={getArrowClasses()} />
        </div>
      )}
    </div>
  );
}

interface HelpButtonProps {
  helpText: string;
  helpUrl?: string;
  className?: string;
}

export function HelpButton({ helpText, helpUrl, className = '' }: HelpButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    if (helpUrl) {
      window.open(helpUrl, '_blank');
    } else {
      setShowTooltip(!showTooltip);
    }
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={handleClick}
        onMouseEnter={() => !helpUrl && setShowTooltip(true)}
        onMouseLeave={() => !helpUrl && setShowTooltip(false)}
        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Help"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      
      {showTooltip && !helpUrl && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap max-w-xs">
            {helpText}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
}

interface GuidedTourStep {
  id: string;
  title: string;
  content: string;
  target: string; // CSS selector
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'hover' | 'none';
  actionText?: string;
}

interface GuidedTourProps {
  steps: GuidedTourStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  tourId: string;
}

export function GuidedTour({ steps, isActive, onComplete, onSkip, tourId }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStepData = steps[currentStep];

  useEffect(() => {
    if (isActive && currentStepData) {
      highlightElement(currentStepData.target);
    } else {
      removeHighlight();
    }

    return () => removeHighlight();
  }, [isActive, currentStep, currentStepData]);

  const highlightElement = (selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      setHighlightedElement(element);
      
      // Scroll element into view
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'center'
      });
      
      // Add highlight class
      element.classList.add('guided-tour-highlight');
      
      // Position tooltip
      positionTooltip(element);
    }
  };

  const removeHighlight = () => {
    if (highlightedElement) {
      highlightedElement.classList.remove('guided-tour-highlight');
      setHighlightedElement(null);
    }
  };

  const positionTooltip = (element: HTMLElement) => {
    if (!tooltipRef.current) return;

    const rect = element.getBoundingClientRect();
    const tooltip = tooltipRef.current;
    const position = currentStepData.position || 'bottom';
    
    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = rect.top - tooltip.offsetHeight - 10;
        left = rect.left + (rect.width - tooltip.offsetWidth) / 2;
        break;
      case 'bottom':
        top = rect.bottom + 10;
        left = rect.left + (rect.width - tooltip.offsetWidth) / 2;
        break;
      case 'left':
        top = rect.top + (rect.height - tooltip.offsetHeight) / 2;
        left = rect.left - tooltip.offsetWidth - 10;
        break;
      case 'right':
        top = rect.top + (rect.height - tooltip.offsetHeight) / 2;
        left = rect.right + 10;
        break;
    }

    // Ensure tooltip stays within viewport
    top = Math.max(10, Math.min(top, window.innerHeight - tooltip.offsetHeight - 10));
    left = Math.max(10, Math.min(left, window.innerWidth - tooltip.offsetWidth - 10));

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    removeHighlight();
    onComplete();
    
    // Save tour completion
    localStorage.setItem(`tour-${tourId}-completed`, 'true');
  };

  const handleSkip = () => {
    removeHighlight();
    onSkip();
    
    // Save tour skip
    localStorage.setItem(`tour-${tourId}-skipped`, 'true');
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setIsPlaying(true);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  // Auto-advance when playing
  useEffect(() => {
    if (isPlaying && isActive) {
      const timer = setTimeout(() => {
        if (currentStep < steps.length - 1) {
          setCurrentStep(currentStep + 1);
        } else {
          setIsPlaying(false);
          handleComplete();
        }
      }, 3000); // 3 seconds per step

      return () => clearTimeout(timer);
    }
  }, [isPlaying, currentStep, isActive]);

  if (!isActive || !currentStepData) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        ref={overlayRef}
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-50 max-w-sm"
        style={{ pointerEvents: 'auto' }}
      >
        <Card className="shadow-xl border-2 border-blue-500">
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  Step {currentStep + 1} of {steps.length}
                </Badge>
                <h3 className="font-semibold text-gray-900">
                  {currentStepData.title}
                </h3>
              </div>
              <button
                onClick={handleSkip}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <p className="text-gray-600 mb-4">
              {currentStepData.content}
            </p>

            {/* Action hint */}
            {currentStepData.action && currentStepData.action !== 'none' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  {currentStepData.actionText || 
                    `${currentStepData.action === 'click' ? 'Click' : 'Hover over'} the highlighted element to continue`
                  }
                </p>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handlePlayPause}
                  className="p-1"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRestart}
                  className="p-1"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  size="sm"
                  onClick={handleNext}
                >
                  {currentStep === steps.length - 1 ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Complete
                    </>
                  ) : (
                    <>
                      Next
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div
                  className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Styles for highlighting */}
      <style jsx global>{`
        .guided-tour-highlight {
          position: relative;
          z-index: 41;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2);
          border-radius: 4px;
        }
      `}</style>
    </>
  );
}

interface QuickHelpProps {
  tips: Array<{
    id: string;
    title: string;
    description: string;
    icon?: React.ComponentType<any>;
  }>;
  className?: string;
}

export function QuickHelp({ tips, className = '' }: QuickHelpProps) {
  const [currentTip, setCurrentTip] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 5000); // Change tip every 5 seconds

    return () => clearInterval(timer);
  }, [tips.length]);

  if (!isVisible || tips.length === 0) return null;

  const tip = tips[currentTip];
  const Icon = tip.icon;

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {Icon && (
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Icon className="h-4 w-4 text-blue-600" />
            </div>
          )}
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900 mb-1">
              💡 {tip.title}
            </h4>
            <p className="text-sm text-blue-800">
              {tip.description}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="flex-shrink-0 p-1 text-blue-400 hover:text-blue-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {tips.length > 1 && (
        <div className="flex items-center justify-center mt-3 space-x-1">
          {tips.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentTip(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentTip ? 'bg-blue-600' : 'bg-blue-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Wand2, 
  Languages, 
  Lightbulb, 
  BarChart3,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import { AIWritingAssistant } from '../ai/AIWritingAssistant';
import { api } from '../../lib/api';

interface AIContentIntegrationProps {
  content: string;
  onContentUpdate: (content: string) => void;
  className?: string;
}

interface ContentAnalysis {
  seoScore: number;
  readabilityScore: number;
  suggestions: string[];
  keywordDensity: Record<string, number>;
  readingTime: number;
}

export function AIContentIntegration({ 
  content, 
  onContentUpdate, 
  className = '' 
}: AIContentIntegrationProps) {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ContentAnalysis | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [quickActions, setQuickActions] = useState({
    enhancing: false,
    translating: false,
    generating: false
  });

  const { showToast } = useToast();

  const analyzeContent = async () => {
    if (!content.trim()) {
      showToast('Please add some content to analyze', 'error');
      return;
    }

    setIsAnalyzing(true);
    try {
      const response = await api.post('/ai-content/analyze', {
        content: content.trim()
      });

      setAnalysis(response.data);
      setIsExpanded(true);
      showToast('Content analyzed successfully!', 'success');
    } catch (error: any) {
      console.error('Content analysis failed:', error);
      showToast(error.response?.data?.message || 'Failed to analyze content', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const enhanceContent = async (enhancementType: string) => {
    if (!content.trim()) {
      showToast('Please add some content to enhance', 'error');
      return;
    }

    setQuickActions(prev => ({ ...prev, enhancing: true }));
    try {
      const response = await api.post('/ai-content/enhance', {
        content: content.trim(),
        enhancementType
      });

      onContentUpdate(response.data.content);
      showToast(`Content enhanced for ${enhancementType}!`, 'success');
      
      // Re-analyze the enhanced content
      setTimeout(() => analyzeContent(), 500);
    } catch (error: any) {
      console.error('Content enhancement failed:', error);
      showToast(error.response?.data?.message || 'Failed to enhance content', 'error');
    } finally {
      setQuickActions(prev => ({ ...prev, enhancing: false }));
    }
  };

  const generateIdeas = async () => {
    setQuickActions(prev => ({ ...prev, generating: true }));
    try {
      const response = await api.post('/ai-content/ideas', {
        contentType: 'blog_post',
        count: 5
      });

      const ideas = response.data.ideas;
      const ideaText = `Here are some content ideas:\n\n${ideas.map((idea: string, index: number) => `${index + 1}. ${idea}`).join('\n')}`;
      
      onContentUpdate(content + '\n\n' + ideaText);
      showToast('Content ideas generated!', 'success');
    } catch (error: any) {
      console.error('Ideas generation failed:', error);
      showToast(error.response?.data?.message || 'Failed to generate ideas', 'error');
    } finally {
      setQuickActions(prev => ({ ...prev, generating: false }));
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    return 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800';
  };

  return (
    <>
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  AI Content Assistant
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Enhance your content with AI-powered tools
                </p>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAssistantOpen(true)}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Open Assistant
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={analyzeContent}
              disabled={isAnalyzing || !content.trim()}
              className="flex items-center justify-center"
            >
              {isAnalyzing ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <BarChart3 className="mr-2 h-4 w-4" />
              )}
              Analyze
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => enhanceContent('seo')}
              disabled={quickActions.enhancing || !content.trim()}
              className="flex items-center justify-center"
            >
              {quickActions.enhancing ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Enhance SEO
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => enhanceContent('readability')}
              disabled={quickActions.enhancing || !content.trim()}
              className="flex items-center justify-center"
            >
              {quickActions.enhancing ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Improve
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={generateIdeas}
              disabled={quickActions.generating}
              className="flex items-center justify-center"
            >
              {quickActions.generating ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Lightbulb className="mr-2 h-4 w-4" />
              )}
              Ideas
            </Button>
          </div>
        </div>

        {/* Analysis Results */}
        {analysis && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-gray-200 dark:border-gray-700"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Content Analysis
                </h4>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Scores */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className={`p-3 rounded-lg border ${getScoreBgColor(analysis.seoScore)}`}>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getScoreColor(analysis.seoScore)}`}>
                      {analysis.seoScore}
                    </div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      SEO Score
                    </div>
                  </div>
                </div>

                <div className={`p-3 rounded-lg border ${getScoreBgColor(analysis.readabilityScore)}`}>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getScoreColor(analysis.readabilityScore)}`}>
                      {analysis.readabilityScore}
                    </div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Readability
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {analysis.readingTime}
                    </div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Min Read
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {Object.keys(analysis.keywordDensity).length}
                    </div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Keywords
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {/* Keyword Density */}
                  {Object.keys(analysis.keywordDensity).length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                        Keyword Density
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(analysis.keywordDensity).map(([keyword, density]) => (
                          <Badge
                            key={keyword}
                            variant="secondary"
                            className="flex items-center space-x-1"
                          >
                            <span>{keyword}</span>
                            <span className="text-xs opacity-75">
                              {density.toFixed(1)}%
                            </span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {analysis.suggestions.length > 0 && (
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                        Suggestions
                      </h5>
                      <div className="space-y-2">
                        {analysis.suggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
                          >
                            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-yellow-800 dark:text-yellow-300">
                              {suggestion}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Tips */}
        <div className="p-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-2">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                  AI Writing Tips
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Use the full assistant for advanced features like content generation, 
                  translation, and detailed enhancement options.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Writing Assistant Modal */}
      <AIWritingAssistant
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        initialContent={content}
        onContentGenerated={onContentUpdate}
      />
    </>
  );
}
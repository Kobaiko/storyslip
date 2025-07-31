import React, { useState, useEffect } from 'react';
import { 
  Search, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Globe, 
  Eye,
  BarChart3,
  Target,
  Lightbulb
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Form';
import { Badge } from '../ui/Badge';
import { Modal, useModal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

interface SEOAnalysis {
  score: number;
  issues: SEOIssue[];
  suggestions: SEOSuggestion[];
  keywords: KeywordAnalysis[];
  readability: ReadabilityScore;
  preview: SearchPreview;
}

interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  fix?: string;
}

interface SEOSuggestion {
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

interface KeywordAnalysis {
  keyword: string;
  density: number;
  count: number;
  recommended: boolean;
}

interface ReadabilityScore {
  score: number;
  level: string;
  avgWordsPerSentence: number;
  avgSentencesPerParagraph: number;
  passiveVoicePercentage: number;
}

interface SearchPreview {
  title: string;
  description: string;
  url: string;
}

interface SEOOptimizerProps {
  title: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  slug: string;
  onSEOUpdate: (seoData: {
    seo_title: string;
    seo_description: string;
    seo_keywords: string;
  }) => void;
}

export function SEOOptimizer({
  title,
  content,
  seoTitle = '',
  seoDescription = '',
  seoKeywords = '',
  slug,
  onSEOUpdate,
}: SEOOptimizerProps) {
  const [analysis, setAnalysis] = useState<SEOAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [localSEOTitle, setLocalSEOTitle] = useState(seoTitle);
  const [localSEODescription, setLocalSEODescription] = useState(seoDescription);
  const [localSEOKeywords, setLocalSEOKeywords] = useState(seoKeywords);
  const [focusKeyword, setFocusKeyword] = useState('');

  const keywordModal = useModal();
  const previewModal = useModal();
  const { success, error: showError } = useToast();

  // Mock SEO analysis function
  const analyzeSEO = async (): Promise<SEOAnalysis> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const wordCount = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).length;
    const paragraphs = content.split(/\n\s*\n/).length;

    const issues: SEOIssue[] = [];
    const suggestions: SEOSuggestion[] = [];

    // Title analysis
    if (!localSEOTitle) {
      issues.push({
        type: 'error',
        title: 'Missing SEO Title',
        description: 'Your content needs an SEO title for search engines.',
        fix: 'Add a compelling title under 60 characters.',
      });
    } else if (localSEOTitle.length > 60) {
      issues.push({
        type: 'warning',
        title: 'SEO Title Too Long',
        description: 'Your SEO title is longer than 60 characters and may be truncated.',
        fix: 'Shorten your title to under 60 characters.',
      });
    }

    // Description analysis
    if (!localSEODescription) {
      issues.push({
        type: 'error',
        title: 'Missing Meta Description',
        description: 'Your content needs a meta description for search engines.',
        fix: 'Add a compelling description under 160 characters.',
      });
    } else if (localSEODescription.length > 160) {
      issues.push({
        type: 'warning',
        title: 'Meta Description Too Long',
        description: 'Your meta description is longer than 160 characters and may be truncated.',
        fix: 'Shorten your description to under 160 characters.',
      });
    }

    // Content length analysis
    if (wordCount < 300) {
      issues.push({
        type: 'warning',
        title: 'Content Too Short',
        description: 'Your content is quite short. Longer content tends to rank better.',
        fix: 'Consider expanding your content to at least 300 words.',
      });
    }

    // Keyword analysis
    const keywords = localSEOKeywords.split(',').map(k => k.trim()).filter(k => k);
    const keywordAnalysis: KeywordAnalysis[] = keywords.map(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = content.match(regex) || [];
      const density = (matches.length / wordCount) * 100;
      
      return {
        keyword,
        density,
        count: matches.length,
        recommended: density >= 0.5 && density <= 3,
      };
    });

    // Suggestions
    suggestions.push({
      title: 'Add Internal Links',
      description: 'Link to other relevant content on your site to improve SEO.',
      impact: 'medium',
    });

    suggestions.push({
      title: 'Optimize Images',
      description: 'Add alt text to images and compress them for better performance.',
      impact: 'medium',
    });

    suggestions.push({
      title: 'Use Header Tags',
      description: 'Structure your content with H1, H2, and H3 tags for better readability.',
      impact: 'high',
    });

    // Calculate overall score
    let score = 100;
    issues.forEach(issue => {
      if (issue.type === 'error') score -= 20;
      if (issue.type === 'warning') score -= 10;
    });
    score = Math.max(0, score);

    return {
      score,
      issues,
      suggestions,
      keywords: keywordAnalysis,
      readability: {
        score: 75,
        level: 'Good',
        avgWordsPerSentence: wordCount / sentences,
        avgSentencesPerParagraph: sentences / paragraphs,
        passiveVoicePercentage: 15,
      },
      preview: {
        title: localSEOTitle || title,
        description: localSEODescription || content.substring(0, 160) + '...',
        url: `https://example.com/${slug}`,
      },
    };
  };

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await analyzeSEO();
      setAnalysis(result);
    } catch (error) {
      showError('Failed to analyze SEO');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    onSEOUpdate({
      seo_title: localSEOTitle,
      seo_description: localSEODescription,
      seo_keywords: localSEOKeywords,
    });
    success('SEO settings updated');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <CheckCircle className="h-4 w-4 text-blue-600" />;
    }
  };

  const getImpactBadgeVariant = (impact: string) => {
    switch (impact) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      default: return 'secondary';
    }
  };

  useEffect(() => {
    if (title && content) {
      handleAnalyze();
    }
  }, [title, content, localSEOTitle, localSEODescription, localSEOKeywords]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Search className="h-6 w-6 mr-2" />
            SEO Optimizer
          </h2>
          <p className="text-gray-600">Optimize your content for search engines</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={previewModal.open}
            leftIcon={<Eye className="h-4 w-4" />}
          >
            Preview
          </Button>
          
          <Button
            onClick={handleAnalyze}
            loading={loading}
            leftIcon={<BarChart3 className="h-4 w-4" />}
          >
            Analyze
          </Button>
        </div>
      </div>

      {/* SEO Score */}
      {analysis && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">SEO Score</h3>
                <p className="text-gray-600">Overall optimization score for your content</p>
              </div>
              
              <div className="text-center">
                <div className={`text-4xl font-bold ${getScoreColor(analysis.score)}`}>
                  {analysis.score}
                </div>
                <Badge variant={getScoreBadgeVariant(analysis.score)}>
                  {analysis.score >= 80 ? 'Excellent' : 
                   analysis.score >= 60 ? 'Good' : 'Needs Work'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEO Settings */}
      <Card>
        <CardHeader>
          <CardTitle>SEO Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              label="SEO Title"
              value={localSEOTitle}
              onChange={(e) => setLocalSEOTitle(e.target.value)}
              placeholder="Enter SEO title..."
              helperText={`${localSEOTitle.length}/60 characters`}
              maxLength={60}
            />
          </div>

          <div>
            <Textarea
              label="Meta Description"
              value={localSEODescription}
              onChange={(e) => setLocalSEODescription(e.target.value)}
              placeholder="Enter meta description..."
              helperText={`${localSEODescription.length}/160 characters`}
              maxLength={160}
              rows={3}
            />
          </div>

          <div>
            <Input
              label="Keywords"
              value={localSEOKeywords}
              onChange={(e) => setLocalSEOKeywords(e.target.value)}
              placeholder="keyword1, keyword2, keyword3"
              helperText="Comma-separated keywords"
            />
          </div>

          <div>
            <Input
              label="Focus Keyword"
              value={focusKeyword}
              onChange={(e) => setFocusKeyword(e.target.value)}
              placeholder="Enter main keyword to optimize for..."
              helperText="The primary keyword you want to rank for"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave}>
              Save SEO Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Issues */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Issues ({analysis.issues.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.issues.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-gray-600">No issues found!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {analysis.issues.map((issue, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      {getIssueIcon(issue.type)}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{issue.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                        {issue.fix && (
                          <p className="text-sm text-blue-600 mt-1">
                            <strong>Fix:</strong> {issue.fix}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lightbulb className="h-5 w-5 mr-2" />
                Suggestions ({analysis.suggestions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Target className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">{suggestion.title}</h4>
                        <Badge variant={getImpactBadgeVariant(suggestion.impact)} size="sm">
                          {suggestion.impact} impact
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{suggestion.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Keyword Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Keyword Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {analysis.keywords.length === 0 ? (
                <p className="text-gray-600">No keywords to analyze. Add some keywords above.</p>
              ) : (
                <div className="space-y-3">
                  {analysis.keywords.map((keyword, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{keyword.keyword}</h4>
                        <p className="text-sm text-gray-600">
                          {keyword.count} occurrences • {keyword.density.toFixed(1)}% density
                        </p>
                      </div>
                      <Badge variant={keyword.recommended ? 'success' : 'warning'}>
                        {keyword.recommended ? 'Good' : 'Optimize'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Readability */}
          <Card>
            <CardHeader>
              <CardTitle>Readability Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Overall Score</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{analysis.readability.score}/100</span>
                    <Badge variant="success">{analysis.readability.level}</Badge>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg. words per sentence</span>
                    <span>{analysis.readability.avgWordsPerSentence.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg. sentences per paragraph</span>
                    <span>{analysis.readability.avgSentencesPerParagraph.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Passive voice</span>
                    <span>{analysis.readability.passiveVoicePercentage}%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Preview Modal */}
      <Modal
        isOpen={previewModal.isOpen}
        onClose={previewModal.close}
        title="Search Engine Preview"
        size="lg"
      >
        <div className="p-6">
          <div className="bg-white border rounded-lg p-4">
            <div className="text-blue-600 text-lg hover:underline cursor-pointer">
              {analysis?.preview.title || localSEOTitle || title}
            </div>
            <div className="text-green-700 text-sm mt-1">
              {analysis?.preview.url || `https://example.com/${slug}`}
            </div>
            <div className="text-gray-600 text-sm mt-2">
              {analysis?.preview.description || localSEODescription || 'No meta description available.'}
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p>This is how your content will appear in search engine results.</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
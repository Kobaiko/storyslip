import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Wand2,
  Languages,
  Lightbulb,
  BarChart3,
  Settings,
  Copy,
  Download,
  RefreshCw,
  Loader2,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useToast } from '../ui/Toast';
import { api } from '../../lib/api';

interface AIWritingAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  initialContent?: string;
  onContentGenerated?: (content: string) => void;
}

interface Template {
  id: string;
  name: string;
  description: string;
  prompts: string[];
  defaultSettings: {
    contentType: string;
    tone: string;
    length: string;
    includeOutline: boolean;
  };
}

interface GeneratedContent {
  content: string;
  title?: string;
  outline?: string[];
  seoScore?: number;
  readabilityScore?: number;
  suggestions?: string[];
}

interface UsageStats {
  remainingRequests: number;
  totalRequests: number;
  resetTime: string;
}

export function AIWritingAssistant({ 
  isOpen, 
  onClose, 
  initialContent = '',
  onContentGenerated 
}: AIWritingAssistantProps) {
  const [activeTab, setActiveTab] = useState('generate');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [languages, setLanguages] = useState<any[]>([]);
  
  // Form states
  const [prompt, setPrompt] = useState('');
  const [contentType, setContentType] = useState('blog_post');
  const [tone, setTone] = useState('conversational');
  const [length, setLength] = useState('medium');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState('');
  const [language, setLanguage] = useState('English');
  const [includeOutline, setIncludeOutline] = useState(false);
  
  // Enhancement states
  const [contentToEnhance, setContentToEnhance] = useState(initialContent);
  const [enhancementType, setEnhancementType] = useState('seo');
  
  // Translation states
  const [contentToTranslate, setContentToTranslate] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('English');
  const [targetLanguage, setTargetLanguage] = useState('Spanish');
  
  // Ideas states
  const [ideaTopic, setIdeaTopic] = useState('');
  const [ideaIndustry, setIdeaIndustry] = useState('');
  const [ideaContentType, setIdeaContentType] = useState('blog_post');
  const [generatedIdeas, setGeneratedIdeas] = useState<string[]>([]);

  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialContent) {
      setContentToEnhance(initialContent);
    }
  }, [initialContent]);

  const loadInitialData = async () => {
    try {
      const [templatesRes, usageRes, languagesRes] = await Promise.all([
        api.get('/ai-content/templates'),
        api.get('/ai-content/usage'),
        api.get('/ai-content/languages')
      ]);

      setTemplates(templatesRes.data.templates);
      setUsageStats(usageRes.data);
      setLanguages(languagesRes.data.languages);
    } catch (error) {
      console.error('Failed to load AI assistant data:', error);
      showToast('Failed to load AI assistant data', 'error');
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      showToast('Please enter a prompt', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/ai-content/generate', {
        prompt,
        contentType,
        tone,
        length,
        keywords: keywords.filter(k => k.trim()),
        targetAudience: targetAudience.trim() || undefined,
        language,
        includeOutline
      });

      setGeneratedContent(response.data);
      showToast('Content generated successfully!', 'success');
      
      // Update usage stats
      const usageRes = await api.get('/ai-content/usage');
      setUsageStats(usageRes.data);

    } catch (error: any) {
      console.error('Content generation failed:', error);
      showToast(error.response?.data?.message || 'Failed to generate content', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnhance = async () => {
    if (!contentToEnhance.trim()) {
      showToast('Please enter content to enhance', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/ai-content/enhance', {
        content: contentToEnhance,
        enhancementType,
        targetKeywords: keywords.filter(k => k.trim()),
        tone: tone !== 'conversational' ? tone : undefined
      });

      setGeneratedContent(response.data);
      showToast('Content enhanced successfully!', 'success');

      const usageRes = await api.get('/ai-content/usage');
      setUsageStats(usageRes.data);

    } catch (error: any) {
      console.error('Content enhancement failed:', error);
      showToast(error.response?.data?.message || 'Failed to enhance content', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!contentToTranslate.trim()) {
      showToast('Please enter content to translate', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/ai-content/translate', {
        content: contentToTranslate,
        sourceLanguage,
        targetLanguage,
        preserveFormatting: true
      });

      setGeneratedContent(response.data);
      showToast('Content translated successfully!', 'success');

      const usageRes = await api.get('/ai-content/usage');
      setUsageStats(usageRes.data);

    } catch (error: any) {
      console.error('Content translation failed:', error);
      showToast(error.response?.data?.message || 'Failed to translate content', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateIdeas = async () => {
    setIsLoading(true);
    try {
      const response = await api.post('/ai-content/ideas', {
        topic: ideaTopic.trim() || undefined,
        industry: ideaIndustry.trim() || undefined,
        contentType: ideaContentType,
        count: 10
      });

      setGeneratedIdeas(response.data.ideas);
      showToast('Ideas generated successfully!', 'success');

      const usageRes = await api.get('/ai-content/usage');
      setUsageStats(usageRes.data);

    } catch (error: any) {
      console.error('Ideas generation failed:', error);
      showToast(error.response?.data?.message || 'Failed to generate ideas', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setContentType(template.defaultSettings.contentType);
    setTone(template.defaultSettings.tone);
    setLength(template.defaultSettings.length);
    setIncludeOutline(template.defaultSettings.includeOutline);
    setPrompt(template.prompts[0]);
  };

  const handleCopyContent = async () => {
    if (generatedContent?.content) {
      try {
        await navigator.clipboard.writeText(generatedContent.content);
        showToast('Content copied to clipboard!', 'success');
      } catch (error) {
        showToast('Failed to copy content', 'error');
      }
    }
  };

  const handleUseContent = () => {
    if (generatedContent?.content && onContentGenerated) {
      onContentGenerated(generatedContent.content);
      onClose();
      showToast('Content added to editor!', 'success');
    }
  };

  const addKeyword = (keyword: string) => {
    if (keyword.trim() && !keywords.includes(keyword.trim())) {
      setKeywords([...keywords, keyword.trim()]);
    }
  };

  const removeKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const tabs = [
    { id: 'generate', label: 'Generate', icon: Sparkles },
    { id: 'enhance', label: 'Enhance', icon: Wand2 },
    { id: 'translate', label: 'Translate', icon: Languages },
    { id: 'ideas', label: 'Ideas', icon: Lightbulb }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex flex-col h-full max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                AI Writing Assistant
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generate, enhance, and translate content with AI
              </p>
            </div>
          </div>
          
          {/* Usage Stats */}
          {usageStats && (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {usageStats.remainingRequests} / {usageStats.totalRequests}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Requests remaining
                </div>
              </div>
              <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ 
                    width: `${(usageStats.remainingRequests / usageStats.totalRequests) * 100}%` 
                  }}
                />
              </div>
            </div>
          )}
          
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Controls */}
          <div className="w-1/2 p-6 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <Tabs
              tabs={tabs}
              activeTab={activeTab}
              onChange={setActiveTab}
              className="mb-6"
            />

            {/* Generate Tab */}
            {activeTab === 'generate' && (
              <div className="space-y-6">
                {/* Templates */}
                {templates.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Quick Templates
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {templates.slice(0, 6).map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleUseTemplate(template)}
                          className={`p-3 text-left border rounded-lg transition-colors ${
                            selectedTemplate?.id === template.id
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="font-medium text-sm text-gray-900 dark:text-white">
                            {template.name}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {template.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prompt */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    What would you like to write about?
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you want to create..."
                    className="w-full h-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Settings Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Content Type
                    </label>
                    <select
                      value={contentType}
                      onChange={(e) => setContentType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="blog_post">Blog Post</option>
                      <option value="article">Article</option>
                      <option value="social_media">Social Media</option>
                      <option value="email">Email</option>
                      <option value="product_description">Product Description</option>
                      <option value="landing_page">Landing Page</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tone
                    </label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="professional">Professional</option>
                      <option value="casual">Casual</option>
                      <option value="friendly">Friendly</option>
                      <option value="authoritative">Authoritative</option>
                      <option value="conversational">Conversational</option>
                      <option value="persuasive">Persuasive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Length
                    </label>
                    <select
                      value={length}
                      onChange={(e) => setLength(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      <option value="short">Short (~250 words)</option>
                      <option value="medium">Medium (~500 words)</option>
                      <option value="long">Long (~1000 words)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Language
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      {languages.map((lang) => (
                        <option key={lang.code} value={lang.name}>
                          {lang.name} ({lang.nativeName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Keywords */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Keywords (optional)
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {keywords.map((keyword, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center space-x-1"
                      >
                        <span>{keyword}</span>
                        <button
                          onClick={() => removeKeyword(index)}
                          className="ml-1 text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Add keyword and press Enter"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addKeyword(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>

                {/* Target Audience */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Target Audience (optional)
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g., small business owners, tech enthusiasts"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Options */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeOutline"
                    checked={includeOutline}
                    onChange={(e) => setIncludeOutline(e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="includeOutline" className="text-sm text-gray-700 dark:text-gray-300">
                    Include content outline
                  </label>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isLoading || !prompt.trim()}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Content
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Enhance Tab */}
            {activeTab === 'enhance' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content to Enhance
                  </label>
                  <textarea
                    value={contentToEnhance}
                    onChange={(e) => setContentToEnhance(e.target.value)}
                    placeholder="Paste your content here..."
                    className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Enhancement Type
                  </label>
                  <select
                    value={enhancementType}
                    onChange={(e) => setEnhancementType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="grammar">Grammar & Style</option>
                    <option value="seo">SEO Optimization</option>
                    <option value="tone">Tone Adjustment</option>
                    <option value="readability">Readability</option>
                    <option value="engagement">Engagement</option>
                  </select>
                </div>

                <Button
                  onClick={handleEnhance}
                  disabled={isLoading || !contentToEnhance.trim()}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enhancing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Enhance Content
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Translate Tab */}
            {activeTab === 'translate' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content to Translate
                  </label>
                  <textarea
                    value={contentToTranslate}
                    onChange={(e) => setContentToTranslate(e.target.value)}
                    placeholder="Enter content to translate..."
                    className="w-full h-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      From
                    </label>
                    <select
                      value={sourceLanguage}
                      onChange={(e) => setSourceLanguage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      {languages.map((lang) => (
                        <option key={lang.code} value={lang.name}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      To
                    </label>
                    <select
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    >
                      {languages.map((lang) => (
                        <option key={lang.code} value={lang.name}>
                          {lang.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button
                  onClick={handleTranslate}
                  disabled={isLoading || !contentToTranslate.trim()}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Translating...
                    </>
                  ) : (
                    <>
                      <Languages className="mr-2 h-4 w-4" />
                      Translate Content
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Ideas Tab */}
            {activeTab === 'ideas' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Topic (optional)
                  </label>
                  <input
                    type="text"
                    value={ideaTopic}
                    onChange={(e) => setIdeaTopic(e.target.value)}
                    placeholder="e.g., digital marketing, sustainability"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Industry (optional)
                  </label>
                  <input
                    type="text"
                    value={ideaIndustry}
                    onChange={(e) => setIdeaIndustry(e.target.value)}
                    placeholder="e.g., technology, healthcare, finance"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content Type
                  </label>
                  <select
                    value={ideaContentType}
                    onChange={(e) => setIdeaContentType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="blog_post">Blog Post</option>
                    <option value="article">Article</option>
                    <option value="social_media">Social Media</option>
                    <option value="email">Email</option>
                    <option value="video">Video</option>
                    <option value="podcast">Podcast</option>
                  </select>
                </div>

                <Button
                  onClick={handleGenerateIdeas}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Ideas...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="mr-2 h-4 w-4" />
                      Generate Ideas
                    </>
                  )}
                </Button>

                {/* Generated Ideas */}
                {generatedIdeas.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Generated Ideas
                    </h4>
                    <div className="space-y-2">
                      {generatedIdeas.map((idea, index) => (
                        <div
                          key={index}
                          className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-start justify-between">
                            <p className="text-sm text-gray-900 dark:text-white flex-1">
                              {idea}
                            </p>
                            <button
                              onClick={() => setPrompt(idea)}
                              className="ml-2 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                              title="Use this idea"
                            >
                              <Sparkles className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Panel - Results */}
          <div className="w-1/2 p-6 overflow-y-auto">
            {generatedContent ? (
              <div className="space-y-6">
                {/* Content Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Generated Content
                  </h3>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyContent}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                    {onContentGenerated && (
                      <Button
                        size="sm"
                        onClick={handleUseContent}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Use Content
                      </Button>
                    )}
                  </div>
                </div>

                {/* Title */}
                {generatedContent.title && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Title
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {generatedContent.title}
                      </p>
                    </div>
                  </div>
                )}

                {/* Outline */}
                {generatedContent.outline && generatedContent.outline.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Outline
                    </label>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <ul className="space-y-1">
                        {generatedContent.outline.map((item, index) => (
                          <li key={index} className="text-sm text-gray-900 dark:text-white">
                            {index + 1}. {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content
                  </label>
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto">
                    <div className="prose dark:prose-invert max-w-none">
                      {generatedContent.content.split('\n').map((paragraph, index) => (
                        <p key={index} className="mb-3 text-gray-900 dark:text-white">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Scores */}
                {(generatedContent.seoScore !== undefined || generatedContent.readabilityScore !== undefined) && (
                  <div className="grid grid-cols-2 gap-4">
                    {generatedContent.seoScore !== undefined && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-800 dark:text-green-300">
                            SEO Score
                          </span>
                          <span className="text-lg font-bold text-green-600 dark:text-green-400">
                            {generatedContent.seoScore}/100
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {generatedContent.readabilityScore !== undefined && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                            Readability
                          </span>
                          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {generatedContent.readabilityScore}/100
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Suggestions */}
                {generatedContent.suggestions && generatedContent.suggestions.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Suggestions
                    </label>
                    <div className="space-y-2">
                      {generatedContent.suggestions.map((suggestion, index) => (
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
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                  <Sparkles className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Ready to create amazing content?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-sm">
                  Use the controls on the left to generate, enhance, translate, or brainstorm content ideas with AI.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
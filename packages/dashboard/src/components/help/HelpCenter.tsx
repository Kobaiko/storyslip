import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Book, 
  MessageCircle, 
  Video, 
  FileText, 
  ExternalLink,
  ChevronRight,
  Star,
  Clock,
  User,
  ArrowLeft,
  Play
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { api } from '../../lib/api';

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  readTime: number;
  rating: number;
  views: number;
  lastUpdated: string;
  author: string;
}

interface VideoTutorial {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  views: number;
  rating: number;
  videoUrl: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  notHelpful: number;
}

interface HelpCenterProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
  initialSearch?: string;
}

export function HelpCenter({ isOpen, onClose, initialCategory, initialSearch }: HelpCenterProps) {
  const [activeTab, setActiveTab] = useState<'articles' | 'videos' | 'faq'>('articles');
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'all');
  const [articles, setArticles] = useState<HelpArticle[]>([]);
  const [videos, setVideos] = useState<VideoTutorial[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoTutorial | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const categories = [
    { id: 'all', name: 'All Topics', icon: Book },
    { id: 'getting-started', name: 'Getting Started', icon: Play },
    { id: 'content-management', name: 'Content Management', icon: FileText },
    { id: 'widget-customization', name: 'Widget Customization', icon: Star },
    { id: 'team-collaboration', name: 'Team & Collaboration', icon: User },
    { id: 'analytics', name: 'Analytics & Reporting', icon: Clock },
    { id: 'integrations', name: 'Integrations', icon: ExternalLink },
  ];

  useEffect(() => {
    if (isOpen) {
      loadHelpContent();
    }
  }, [isOpen, activeTab, selectedCategory, searchQuery]);

  const loadHelpContent = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        category: selectedCategory,
        search: searchQuery,
      });

      if (activeTab === 'articles') {
        const response = await api.get(`/help/articles?${params}`);
        setArticles(response.data);
      } else if (activeTab === 'videos') {
        const response = await api.get(`/help/videos?${params}`);
        setVideos(response.data);
      } else if (activeTab === 'faq') {
        const response = await api.get(`/help/faq?${params}`);
        setFaqs(response.data);
      }
    } catch (error) {
      console.error('Failed to load help content:', error);
      // Load fallback content
      loadFallbackContent();
    } finally {
      setIsLoading(false);
    }
  };

  const loadFallbackContent = () => {
    // Fallback content when API is not available
    if (activeTab === 'articles') {
      setArticles([
        {
          id: '1',
          title: 'Getting Started with StorySlip',
          content: 'Learn how to set up your first website and start managing content...',
          category: 'getting-started',
          tags: ['setup', 'basics', 'website'],
          difficulty: 'beginner',
          readTime: 5,
          rating: 4.8,
          views: 1250,
          lastUpdated: '2024-01-15',
          author: 'StorySlip Team'
        },
        {
          id: '2',
          title: 'Creating and Managing Content',
          content: 'Comprehensive guide to creating, editing, and organizing your content...',
          category: 'content-management',
          tags: ['content', 'editing', 'publishing'],
          difficulty: 'beginner',
          readTime: 8,
          rating: 4.6,
          views: 980,
          lastUpdated: '2024-01-12',
          author: 'StorySlip Team'
        },
        {
          id: '3',
          title: 'Customizing Your Widget Appearance',
          content: 'Learn how to style your content widget to match your brand...',
          category: 'widget-customization',
          tags: ['styling', 'branding', 'customization'],
          difficulty: 'intermediate',
          readTime: 12,
          rating: 4.7,
          views: 756,
          lastUpdated: '2024-01-10',
          author: 'StorySlip Team'
        }
      ]);
    } else if (activeTab === 'videos') {
      setVideos([
        {
          id: '1',
          title: 'StorySlip Quick Start Guide',
          description: 'Get up and running with StorySlip in under 10 minutes',
          thumbnail: '/api/placeholder/320/180',
          duration: 540,
          category: 'getting-started',
          difficulty: 'beginner',
          views: 2340,
          rating: 4.9,
          videoUrl: '#'
        },
        {
          id: '2',
          title: 'Advanced Widget Customization',
          description: 'Deep dive into widget styling and advanced customization options',
          thumbnail: '/api/placeholder/320/180',
          duration: 720,
          category: 'widget-customization',
          difficulty: 'advanced',
          views: 890,
          rating: 4.7,
          videoUrl: '#'
        }
      ]);
    } else if (activeTab === 'faq') {
      setFaqs([
        {
          id: '1',
          question: 'How do I add StorySlip to my website?',
          answer: 'Simply copy the embed code from your dashboard and paste it into your website\'s HTML where you want the content to appear.',
          category: 'getting-started',
          helpful: 45,
          notHelpful: 2
        },
        {
          id: '2',
          question: 'Can I customize the appearance of the widget?',
          answer: 'Yes! You can customize colors, fonts, layout, and more through the widget customization panel in your dashboard.',
          category: 'widget-customization',
          helpful: 38,
          notHelpful: 1
        },
        {
          id: '3',
          question: 'How many team members can I invite?',
          answer: 'The number of team members depends on your plan. Starter plans include 3 team members, while Pro plans include unlimited team members.',
          category: 'team-collaboration',
          helpful: 29,
          notHelpful: 3
        }
      ]);
    }
  };

  const handleArticleClick = (article: HelpArticle) => {
    setSelectedArticle(article);
    // Track article view
    api.post(`/help/articles/${article.id}/view`).catch(() => {});
  };

  const handleVideoClick = (video: VideoTutorial) => {
    setSelectedVideo(video);
    // Track video view
    api.post(`/help/videos/${video.id}/view`).catch(() => {});
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredContent = () => {
    let content: any[] = [];
    
    if (activeTab === 'articles') content = articles;
    else if (activeTab === 'videos') content = videos;
    else if (activeTab === 'faq') content = faqs;

    if (selectedCategory !== 'all') {
      content = content.filter(item => item.category === selectedCategory);
    }

    if (searchQuery) {
      content = content.filter(item => 
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.question?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return content;
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl">
      <div className="h-[80vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 pb-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Help Center</h2>
            <Button variant="ghost" onClick={onClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search help articles, videos, and FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-200 pr-6 mr-6">
            {/* Tabs */}
            <div className="space-y-2 mb-6">
              <button
                onClick={() => setActiveTab('articles')}
                className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                  activeTab === 'articles' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <FileText className="h-4 w-4 mr-3" />
                Articles
              </button>
              <button
                onClick={() => setActiveTab('videos')}
                className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                  activeTab === 'videos' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Video className="h-4 w-4 mr-3" />
                Videos
              </button>
              <button
                onClick={() => setActiveTab('faq')}
                className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                  activeTab === 'faq' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <MessageCircle className="h-4 w-4 mr-3" />
                FAQ
              </button>
            </div>

            {/* Categories */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Categories</h3>
              <div className="space-y-1">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center px-3 py-2 text-left text-sm rounded-lg transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-3" />
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            {selectedArticle ? (
              <ArticleView 
                article={selectedArticle} 
                onBack={() => setSelectedArticle(null)} 
              />
            ) : selectedVideo ? (
              <VideoView 
                video={selectedVideo} 
                onBack={() => setSelectedVideo(null)} 
              />
            ) : (
              <div>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeTab === 'articles' && (
                      <ArticlesList 
                        articles={filteredContent() as HelpArticle[]} 
                        onArticleClick={handleArticleClick}
                      />
                    )}
                    {activeTab === 'videos' && (
                      <VideosList 
                        videos={filteredContent() as VideoTutorial[]} 
                        onVideoClick={handleVideoClick}
                      />
                    )}
                    {activeTab === 'faq' && (
                      <FAQList faqs={filteredContent() as FAQ[]} />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ArticlesList({ articles, onArticleClick }: { 
  articles: HelpArticle[]; 
  onArticleClick: (article: HelpArticle) => void; 
}) {
  if (articles.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
        <p className="text-gray-600">Try adjusting your search or category filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <Card 
          key={article.id} 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onArticleClick(article)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                {article.title}
              </h3>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            
            <p className="text-gray-600 mb-3 line-clamp-2">
              {article.content.substring(0, 150)}...
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge className={getDifficultyColor(article.difficulty)}>
                  {article.difficulty}
                </Badge>
                <span className="text-sm text-gray-500">
                  {article.readTime} min read
                </span>
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 mr-1" />
                  <span className="text-sm text-gray-600">{article.rating}</span>
                </div>
              </div>
              <span className="text-sm text-gray-500">
                {article.views} views
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function VideosList({ videos, onVideoClick }: { 
  videos: VideoTutorial[]; 
  onVideoClick: (video: VideoTutorial) => void; 
}) {
  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No videos found</h3>
        <p className="text-gray-600">Try adjusting your search or category filter.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {videos.map((video) => (
        <Card 
          key={video.id} 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onVideoClick(video)}
        >
          <div className="relative">
            <img 
              src={video.thumbnail} 
              alt={video.title}
              className="w-full h-48 object-cover rounded-t-lg"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <Play className="h-12 w-12 text-white" />
            </div>
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
              {formatDuration(video.duration)}
            </div>
          </div>
          
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {video.title}
            </h3>
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {video.description}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Badge className={getDifficultyColor(video.difficulty)}>
                  {video.difficulty}
                </Badge>
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 mr-1" />
                  <span className="text-sm text-gray-600">{video.rating}</span>
                </div>
              </div>
              <span className="text-sm text-gray-500">
                {video.views} views
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FAQList({ faqs }: { faqs: FAQ[] }) {
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  if (faqs.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No FAQs found</h3>
        <p className="text-gray-600">Try adjusting your search or category filter.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {faqs.map((faq) => (
        <Card key={faq.id}>
          <CardContent className="p-4">
            <button
              onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {faq.question}
                </h3>
                <ChevronRight 
                  className={`h-5 w-5 text-gray-400 transition-transform ${
                    expandedFAQ === faq.id ? 'rotate-90' : ''
                  }`} 
                />
              </div>
            </button>
            
            {expandedFAQ === faq.id && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-gray-600 mb-4">{faq.answer}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">Was this helpful?</span>
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="ghost">
                        👍 {faq.helpful}
                      </Button>
                      <Button size="sm" variant="ghost">
                        👎 {faq.notHelpful}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ArticleView({ article, onBack }: { article: HelpArticle; onBack: () => void }) {
  return (
    <div>
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={onBack} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Articles
        </Button>
      </div>
      
      <article className="max-w-3xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{article.title}</h1>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
            <span>By {article.author}</span>
            <span>•</span>
            <span>{article.readTime} min read</span>
            <span>•</span>
            <span>Updated {new Date(article.lastUpdated).toLocaleDateString()}</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge className={getDifficultyColor(article.difficulty)}>
              {article.difficulty}
            </Badge>
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-400 mr-1" />
              <span>{article.rating}</span>
            </div>
            <span className="text-gray-500">{article.views} views</span>
          </div>
        </header>
        
        <div className="prose max-w-none">
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </div>
        
        <footer className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Was this article helpful?</span>
              <Button size="sm" variant="ghost">👍</Button>
              <Button size="sm" variant="ghost">👎</Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </footer>
      </article>
    </div>
  );
}

function VideoView({ video, onBack }: { video: VideoTutorial; onBack: () => void }) {
  return (
    <div>
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={onBack} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Videos
        </Button>
      </div>
      
      <div className="max-w-4xl">
        <div className="aspect-video bg-gray-900 rounded-lg mb-6 flex items-center justify-center">
          <div className="text-center text-white">
            <Play className="h-16 w-16 mx-auto mb-4" />
            <p>Video player would be embedded here</p>
            <p className="text-sm opacity-75">Duration: {formatDuration(video.duration)}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">{video.title}</h1>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <Badge className={getDifficultyColor(video.difficulty)}>
              {video.difficulty}
            </Badge>
            <div className="flex items-center">
              <Star className="h-4 w-4 text-yellow-400 mr-1" />
              <span>{video.rating}</span>
            </div>
            <span>{video.views} views</span>
          </div>
          
          <p className="text-gray-600">{video.description}</p>
        </div>
      </div>
    </div>
  );
}
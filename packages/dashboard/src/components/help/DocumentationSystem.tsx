import React, { useState, useEffect } from 'react';
import { 
  Book, 
  Search, 
  Filter, 
  Download, 
  ExternalLink, 
  ChevronDown,
  ChevronRight,
  FileText,
  Video,
  Code,
  Lightbulb,
  Star,
  Clock,
  User,
  Tag,
  Eye,
  ThumbsUp,
  MessageSquare
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { api } from '../../lib/api';

interface DocumentationItem {
  id: string;
  title: string;
  content: string;
  type: 'guide' | 'tutorial' | 'reference' | 'faq';
  category: string;
  subcategory?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  author: string;
  lastUpdated: string;
  readTime: number;
  views: number;
  likes: number;
  comments: number;
  rating: number;
  isPublic: boolean;
  attachments?: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    size: number;
  }>;
}

interface DocumentationCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  subcategories: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  count: number;
}

interface DocumentationSystemProps {
  className?: string;
}

export function DocumentationSystem({ className = '' }: DocumentationSystemProps) {
  const [items, setItems] = useState<DocumentationItem[]>([]);
  const [categories, setCategories] = useState<DocumentationCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'popularity' | 'rating'>('relevance');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['all']));
  const [selectedItem, setSelectedItem] = useState<DocumentationItem | null>(null);

  useEffect(() => {
    loadDocumentation();
    loadCategories();
  }, [selectedCategory, selectedSubcategory, selectedType, selectedDifficulty, searchQuery, sortBy]);

  const loadDocumentation = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        category: selectedCategory,
        subcategory: selectedSubcategory,
        type: selectedType,
        difficulty: selectedDifficulty,
        search: searchQuery,
        sort: sortBy,
      });

      const response = await api.get(`/documentation?${params}`);
      setItems(response.data);
    } catch (error) {
      console.error('Failed to load documentation:', error);
      // Load fallback content
      loadFallbackContent();
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await api.get('/documentation/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
      // Load fallback categories
      setCategories([
        {
          id: 'getting-started',
          name: 'Getting Started',
          description: 'Essential guides to get you up and running',
          icon: Lightbulb,
          subcategories: [
            { id: 'setup', name: 'Initial Setup', count: 5 },
            { id: 'first-steps', name: 'First Steps', count: 8 },
            { id: 'basic-concepts', name: 'Basic Concepts', count: 12 }
          ],
          count: 25
        },
        {
          id: 'content-management',
          name: 'Content Management',
          description: 'Creating, editing, and organizing your content',
          icon: FileText,
          subcategories: [
            { id: 'creating-content', name: 'Creating Content', count: 15 },
            { id: 'editing', name: 'Editing & Formatting', count: 10 },
            { id: 'organization', name: 'Organization', count: 8 }
          ],
          count: 33
        },
        {
          id: 'widget-customization',
          name: 'Widget Customization',
          description: 'Styling and configuring your content widgets',
          icon: Star,
          subcategories: [
            { id: 'styling', name: 'Styling', count: 12 },
            { id: 'configuration', name: 'Configuration', count: 9 },
            { id: 'advanced', name: 'Advanced Customization', count: 6 }
          ],
          count: 27
        },
        {
          id: 'integrations',
          name: 'Integrations',
          description: 'Connecting with third-party services and platforms',
          icon: ExternalLink,
          subcategories: [
            { id: 'cms-platforms', name: 'CMS Platforms', count: 8 },
            { id: 'analytics', name: 'Analytics', count: 5 },
            { id: 'social-media', name: 'Social Media', count: 7 }
          ],
          count: 20
        },
        {
          id: 'api-reference',
          name: 'API Reference',
          description: 'Technical documentation for developers',
          icon: Code,
          subcategories: [
            { id: 'rest-api', name: 'REST API', count: 25 },
            { id: 'webhooks', name: 'Webhooks', count: 8 },
            { id: 'sdk', name: 'SDK Documentation', count: 12 }
          ],
          count: 45
        }
      ]);
    }
  };

  const loadFallbackContent = () => {
    setItems([
      {
        id: '1',
        title: 'Getting Started with StorySlip',
        content: 'Complete guide to setting up your first website and content...',
        type: 'guide',
        category: 'getting-started',
        subcategory: 'setup',
        difficulty: 'beginner',
        tags: ['setup', 'basics', 'website'],
        author: 'StorySlip Team',
        lastUpdated: '2024-01-15',
        readTime: 10,
        views: 2450,
        likes: 89,
        comments: 12,
        rating: 4.8,
        isPublic: true
      },
      {
        id: '2',
        title: 'Advanced Widget Customization',
        content: 'Deep dive into advanced styling and configuration options...',
        type: 'tutorial',
        category: 'widget-customization',
        subcategory: 'advanced',
        difficulty: 'advanced',
        tags: ['styling', 'css', 'customization'],
        author: 'John Developer',
        lastUpdated: '2024-01-12',
        readTime: 25,
        views: 1230,
        likes: 67,
        comments: 8,
        rating: 4.6,
        isPublic: true
      },
      {
        id: '3',
        title: 'REST API Reference',
        content: 'Complete reference for all API endpoints and methods...',
        type: 'reference',
        category: 'api-reference',
        subcategory: 'rest-api',
        difficulty: 'intermediate',
        tags: ['api', 'reference', 'endpoints'],
        author: 'API Team',
        lastUpdated: '2024-01-10',
        readTime: 15,
        views: 3450,
        likes: 156,
        comments: 23,
        rating: 4.9,
        isPublic: true
      }
    ]);
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'guide': return Book;
      case 'tutorial': return Video;
      case 'reference': return Code;
      case 'faq': return MessageSquare;
      default: return FileText;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredItems = items.filter(item => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (selectedSubcategory !== 'all' && item.subcategory !== selectedSubcategory) return false;
    if (selectedType !== 'all' && item.type !== selectedType) return false;
    if (selectedDifficulty !== 'all' && item.difficulty !== selectedDifficulty) return false;
    return true;
  });

  if (selectedItem) {
    return (
      <DocumentationViewer 
        item={selectedItem} 
        onBack={() => setSelectedItem(null)}
        className={className}
      />
    );
  }

  return (
    <div className={`flex h-full ${className}`}>
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 bg-gray-50 p-6 overflow-y-auto">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="guide">Guides</option>
              <option value="tutorial">Tutorials</option>
              <option value="reference">Reference</option>
              <option value="faq">FAQ</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="relevance">Relevance</option>
              <option value="date">Last Updated</option>
              <option value="popularity">Most Popular</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>

        {/* Categories */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Categories</h3>
          <div className="space-y-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`w-full flex items-center px-3 py-2 text-left text-sm rounded-lg transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Book className="h-4 w-4 mr-3" />
              All Documentation
            </button>

            {categories.map((category) => {
              const Icon = category.icon;
              const isExpanded = expandedCategories.has(category.id);
              const isSelected = selectedCategory === category.id;

              return (
                <div key={category.id}>
                  <button
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setSelectedSubcategory('all');
                      toggleCategory(category.id);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-left text-sm rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-3" />
                    <span className="flex-1">{category.name}</span>
                    <span className="text-xs text-gray-500 mr-2">{category.count}</span>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      {category.subcategories.map((subcategory) => (
                        <button
                          key={subcategory.id}
                          onClick={() => setSelectedSubcategory(subcategory.id)}
                          className={`w-full flex items-center justify-between px-3 py-1 text-left text-sm rounded transition-colors ${
                            selectedSubcategory === subcategory.id
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span>{subcategory.name}</span>
                          <span className="text-xs text-gray-500">{subcategory.count}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Documentation</h1>
              <p className="text-gray-600 mt-1">
                {filteredItems.length} {filteredItems.length === 1 ? 'article' : 'articles'} found
              </p>
            </div>
            <Button variant="outline" leftIcon={<Download className="h-4 w-4" />}>
              Export PDF
            </Button>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documentation found</h3>
              <p className="text-gray-600">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredItems.map((item) => (
                <DocumentationCard
                  key={item.id}
                  item={item}
                  onClick={() => setSelectedItem(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentationCard({ 
  item, 
  onClick 
}: { 
  item: DocumentationItem; 
  onClick: () => void; 
}) {
  const TypeIcon = getTypeIcon(item.type);

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <TypeIcon className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                {item.title}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {item.type}
                </Badge>
                <Badge className={`text-xs ${getDifficultyColor(item.difficulty)}`}>
                  {item.difficulty}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Eye className="h-4 w-4 mr-1" />
                {item.views}
              </div>
              <div className="flex items-center">
                <ThumbsUp className="h-4 w-4 mr-1" />
                {item.likes}
              </div>
              <div className="flex items-center">
                <Star className="h-4 w-4 mr-1 text-yellow-400" />
                {item.rating}
              </div>
            </div>
          </div>
        </div>

        <p className="text-gray-600 mb-4 line-clamp-2">
          {item.content.substring(0, 200)}...
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-1" />
              {item.author}
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {item.readTime} min read
            </div>
            <span>Updated {new Date(item.lastUpdated).toLocaleDateString()}</span>
          </div>

          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
            {item.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{item.tags.length - 3}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentationViewer({ 
  item, 
  onBack, 
  className = '' 
}: { 
  item: DocumentationItem; 
  onBack: () => void; 
  className?: string; 
}) {
  const [isLiked, setIsLiked] = useState(false);
  const [likes, setLikes] = useState(item.likes);

  const handleLike = async () => {
    try {
      if (isLiked) {
        await api.delete(`/documentation/${item.id}/like`);
        setLikes(likes - 1);
      } else {
        await api.post(`/documentation/${item.id}/like`);
        setLikes(likes + 1);
      }
      setIsLiked(!isLiked);
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const TypeIcon = getTypeIcon(item.type);

  return (
    <div className={`max-w-4xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack} leftIcon={<ChevronRight className="h-4 w-4 rotate-180" />}>
          Back to Documentation
        </Button>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" leftIcon={<Download className="h-4 w-4" />}>
            Export
          </Button>
          <Button variant="outline" size="sm" leftIcon={<ExternalLink className="h-4 w-4" />}>
            Share
          </Button>
        </div>
      </div>

      {/* Article Header */}
      <header className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-gray-100 rounded-lg">
            <TypeIcon className="h-6 w-6 text-gray-600" />
          </div>
          <div>
            <Badge variant="secondary" className="mb-2">
              {item.type}
            </Badge>
            <h1 className="text-3xl font-bold text-gray-900">{item.title}</h1>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 text-sm text-gray-600">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2" />
              {item.author}
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              {item.readTime} min read
            </div>
            <div className="flex items-center">
              <Eye className="h-4 w-4 mr-2" />
              {item.views} views
            </div>
            <span>Updated {new Date(item.lastUpdated).toLocaleDateString()}</span>
          </div>

          <div className="flex items-center space-x-4">
            <Badge className={getDifficultyColor(item.difficulty)}>
              {item.difficulty}
            </Badge>
            <div className="flex items-center">
              <Star className="h-4 w-4 mr-1 text-yellow-400" />
              <span className="text-sm">{item.rating}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {item.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              <Tag className="h-3 w-3 mr-1" />
              {tag}
            </Badge>
          ))}
        </div>
      </header>

      {/* Content */}
      <article className="prose max-w-none mb-8">
        <div dangerouslySetInnerHTML={{ __html: item.content }} />
      </article>

      {/* Attachments */}
      {item.attachments && item.attachments.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {item.attachments.map((attachment) => (
              <Card key={attachment.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-gray-400" />
                      <div>
                        <h4 className="font-medium text-gray-900">{attachment.name}</h4>
                        <p className="text-sm text-gray-500">
                          {attachment.type} • {(attachment.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" leftIcon={<Download className="h-4 w-4" />}>
                      Download
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">Was this helpful?</span>
            <Button
              size="sm"
              variant={isLiked ? 'default' : 'outline'}
              onClick={handleLike}
              leftIcon={<ThumbsUp className="h-4 w-4" />}
            >
              {likes}
            </Button>
            <Button size="sm" variant="outline" leftIcon={<MessageSquare className="h-4 w-4" />}>
              {item.comments} Comments
            </Button>
          </div>

          <div className="text-sm text-gray-500">
            Last updated: {new Date(item.lastUpdated).toLocaleDateString()}
          </div>
        </div>
      </footer>
    </div>
  );
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'guide': return Book;
    case 'tutorial': return Video;
    case 'reference': return Code;
    case 'faq': return MessageSquare;
    default: return FileText;
  }
}

function getDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case 'beginner': return 'bg-green-100 text-green-800';
    case 'intermediate': return 'bg-yellow-100 text-yellow-800';
    case 'advanced': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}
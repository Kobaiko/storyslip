import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Hash } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';

interface Tag {
  id: string;
  name: string;
  color: string;
  contentCount: number;
  createdAt: string;
}

const mockTags: Tag[] = [
  {
    id: '1',
    name: 'react',
    color: 'blue',
    contentCount: 25,
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'javascript',
    color: 'yellow',
    contentCount: 18,
    createdAt: '2024-01-12'
  },
  {
    id: '3',
    name: 'tutorial',
    color: 'green',
    contentCount: 32,
    createdAt: '2024-01-10'
  },
  {
    id: '4',
    name: 'design',
    color: 'purple',
    contentCount: 14,
    createdAt: '2024-01-08'
  },
  {
    id: '5',
    name: 'api',
    color: 'red',
    contentCount: 9,
    createdAt: '2024-01-05'
  }
];

export function TagsPage() {
  const [tags, setTags] = useState<Tag[]>(mockTags);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteTag = (id: string) => {
    setTags(tags.filter(tag => tag.id !== id));
  };

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      red: 'bg-red-100 text-red-800 border-red-200',
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tags</h1>
          <p className="text-gray-600">Manage tags to help organize and find your content</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Tag
        </Button>
      </div>

      {/* Search and Stats */}
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="text-sm text-gray-500">
          {filteredTags.length} of {tags.length} tags
        </div>
      </div>

      {/* Tags Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredTags.map((tag) => (
          <Card key={tag.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Hash className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900">{tag.name}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="sm">
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteTag(tag.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <Badge 
                  className={`text-xs ${getColorClasses(tag.color)}`}
                  variant="outline"
                >
                  {tag.contentCount} items
                </Badge>
                <span className="text-xs text-gray-500">
                  {new Date(tag.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Popular Tags Section */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {tags
              .sort((a, b) => b.contentCount - a.contentCount)
              .slice(0, 10)
              .map((tag) => (
                <Badge 
                  key={tag.id}
                  className={`cursor-pointer ${getColorClasses(tag.color)}`}
                  variant="outline"
                >
                  #{tag.name} ({tag.contentCount})
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>

      {filteredTags.length === 0 && (
        <div className="text-center py-12">
          <Hash className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tags found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first tag'}
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Tag
          </Button>
        </div>
      )}
    </div>
  );
}
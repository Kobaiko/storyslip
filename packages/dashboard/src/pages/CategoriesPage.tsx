import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Tag } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  contentCount: number;
  createdAt: string;
}

const mockCategories: Category[] = [
  {
    id: '1',
    name: 'Technology',
    description: 'Tech-related content and tutorials',
    color: 'blue',
    contentCount: 12,
    createdAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'Marketing',
    description: 'Marketing strategies and campaigns',
    color: 'green',
    contentCount: 8,
    createdAt: '2024-01-10'
  },
  {
    id: '3',
    name: 'Design',
    description: 'UI/UX and graphic design content',
    color: 'purple',
    contentCount: 15,
    createdAt: '2024-01-05'
  }
];

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteCategory = (id: string) => {
    setCategories(categories.filter(cat => cat.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600">Organize your content with categories</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Category
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCategories.map((category) => (
          <Card key={category.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg bg-${category.color}-100 flex items-center justify-center`}>
                    <Tag className={`w-5 h-5 text-${category.color}-600`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="sm">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteCategory(category.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {category.contentCount} items
                </Badge>
                <span className="text-xs text-gray-500">
                  Created {new Date(category.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first category'}
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Category
          </Button>
        </div>
      )}
    </div>
  );
}
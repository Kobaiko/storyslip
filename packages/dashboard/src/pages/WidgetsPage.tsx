import React from 'react';
import { Plus, Widget, Eye, MousePointer } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

const WidgetsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Widgets</h1>
          <p className="text-gray-600">Create and manage embeddable widgets for your content</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Widget
        </Button>
      </div>

      {/* Widget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Widget Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Widget className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Latest Articles</CardTitle>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Displays the most recent blog posts with images and excerpts
            </p>
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Views</span>
                <div className="flex items-center">
                  <Eye className="h-4 w-4 mr-1 text-gray-400" />
                  <span>2.1K</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Clicks</span>
                <div className="flex items-center">
                  <MousePointer className="h-4 w-4 mr-1 text-gray-400" />
                  <span>156</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" fullWidth>
                Edit
              </Button>
              <Button variant="outline" size="sm" fullWidth>
                Embed
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* More widget cards would go here */}
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center h-48 text-center">
            <Widget className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Create Your First Widget</h3>
            <p className="text-sm text-gray-600 mb-4">
              Get started by creating a widget to embed your content
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Widget
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Widget Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Widget Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <h4 className="font-medium text-gray-900">Content List</h4>
              <p className="text-sm text-gray-600 mt-1">Display a list of your latest content</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <h4 className="font-medium text-gray-900">Featured Article</h4>
              <p className="text-sm text-gray-600 mt-1">Showcase a single featured article</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <h4 className="font-medium text-gray-900">Category Feed</h4>
              <p className="text-sm text-gray-600 mt-1">Display content from specific categories</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { WidgetsPage };
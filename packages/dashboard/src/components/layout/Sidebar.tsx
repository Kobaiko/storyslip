import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Home,
  FileText,
  Folder,
  Tags,
  Package,
  BarChart3,
  Users,
  Settings,
  Palette,
  Globe,
} from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Content', href: '/content', icon: FileText },
  { name: 'Categories', href: '/categories', icon: Folder },
  { name: 'Tags', href: '/tags', icon: Tags },
  { name: 'Widgets', href: '/widgets', icon: Package },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Brand', href: '/brand', icon: Palette },
  { name: 'Websites', href: '/websites', icon: Globe },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">StorySlip</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/' && location.pathname.startsWith(item.href));
              
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )}
                  onClick={() => {
                    // Close mobile sidebar when navigating
                    if (window.innerWidth < 1024) {
                      onClose();
                    }
                  }}
                >
                  <item.icon
                    className={clsx(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    )}
                  />
                  {item.name}
                  {item.badge && (
                    <span className="ml-auto inline-block py-0.5 px-2 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              StorySlip v1.0.0
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export { Sidebar };
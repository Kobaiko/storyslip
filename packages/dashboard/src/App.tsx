import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { queryClient } from './lib/queryClient';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ContentPage } from './pages/ContentPage';
import { WidgetsPage } from './pages/WidgetsPage';
import { ProfilePage } from './pages/ProfilePage';
import { WebsitesPage } from './pages/WebsitesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

// Placeholder components for other pages
const CategoriesPage = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
    <p className="text-gray-600">Category management coming soon...</p>
  </div>
);

const TagsPage = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-gray-900">Tags</h1>
    <p className="text-gray-600">Tag management coming soon...</p>
  </div>
);

const TeamPage = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-gray-900">Team</h1>
    <p className="text-gray-600">Team management coming soon...</p>
  </div>
);

const BrandPage = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-gray-900">Brand</h1>
    <p className="text-gray-600">Brand customization coming soon...</p>
  </div>
);

const SettingsPage = () => (
  <div className="space-y-6">
    <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
    <p className="text-gray-600">Settings coming soon...</p>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Protected routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="content" element={<ContentPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="tags" element={<TagsPage />} />
              <Route path="widgets" element={<WidgetsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="brand" element={<BrandPage />} />
              <Route path="websites" element={<WebsitesPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import { queryClient } from './lib/queryClient';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicRoute } from './components/auth/PublicRoute';

import { SessionManager } from './components/auth/SessionManager';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { ContentPage } from './pages/ContentPage';
import { WidgetsPage } from './pages/WidgetsPage';
import { ProfilePage } from './pages/ProfilePage';
import { WebsitesPage } from './pages/WebsitesPage';
import { BrandPage } from './pages/BrandPage';
import { TeamPage } from './pages/TeamPage';
import ShowcasePage from './pages/ShowcasePage';
// import { AnalyticsPage } from './pages/AnalyticsPage';

// Import functional pages
import { CategoriesPage } from './pages/CategoriesPage';
import { TagsPage } from './pages/TagsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <SessionManager>
            <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            } />
            <Route path="/forgot-password" element={
              <PublicRoute>
                <ForgotPasswordPage />
              </PublicRoute>
            } />
            
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
              <Route path="showcase" element={<ShowcasePage />} />
            </Route>
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
            </Router>
          </SessionManager>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
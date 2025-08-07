import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { OnboardingFlow } from '../onboarding/OnboardingFlow';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useAuth } from '../../contexts/AuthContext';

export function DashboardLayout() {
  const { user } = useAuth();
  const { shouldShow, isLoading, completeOnboarding } = useOnboarding();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Show onboarding if user should see it and we're not loading
    if (!isLoading && shouldShow) {
      setShowOnboarding(true);
    }
  }, [shouldShow, isLoading]);

  const handleOnboardingComplete = async () => {
    try {
      await completeOnboarding();
      setShowOnboarding(false);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  };

  const handleOnboardingClose = () => {
    setShowOnboarding(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>

      {/* Onboarding Flow */}
      <OnboardingFlow
        isOpen={showOnboarding}
        onClose={handleOnboardingClose}
        onComplete={handleOnboardingComplete}
      />
    </div>
  );
}
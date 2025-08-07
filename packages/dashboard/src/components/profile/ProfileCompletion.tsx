import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface ProfileCompletionData {
  percentage: number;
  missing_fields: string[];
}

interface ProfileCompletionProps {
  onComplete?: () => void;
}

export const ProfileCompletion: React.FC<ProfileCompletionProps> = ({ onComplete }) => {
  const [completion, setCompletion] = useState<ProfileCompletionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompletion();
  }, []);

  const loadCompletion = async () => {
    try {
      setLoading(true);
      const response = await api.get('/profile/completion');
      
      if (response.data.success) {
        setCompletion(response.data.data);
        if (response.data.data.percentage === 100 && onComplete) {
          onComplete();
        }
      }
    } catch (error) {
      console.error('Load completion error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      first_name: 'First Name',
      last_name: 'Last Name',
      display_name: 'Display Name',
      avatar_url: 'Profile Picture',
      bio: 'Bio',
      timezone: 'Timezone',
      phone: 'Phone Number',
    };
    return labels[field] || field;
  };

  const getCompletionColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getCompletionTextColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-green-700';
    if (percentage >= 60) return 'text-yellow-700';
    if (percentage >= 40) return 'text-orange-700';
    return 'text-red-700';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-4">
        <LoadingSpinner size="sm" />
      </div>
    );
  }

  if (!completion) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Profile Completion</h3>
        <span className={`text-sm font-medium ${getCompletionTextColor(completion.percentage)}`}>
          {completion.percentage}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getCompletionColor(completion.percentage)}`}
            style={{ width: `${completion.percentage}%` }}
          />
        </div>
      </div>

      {/* Completion Status */}
      {completion.percentage === 100 ? (
        <div className="flex items-center text-green-700 bg-green-50 rounded-lg p-3">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-sm font-medium">Profile complete! Great job!</span>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-600 mb-3">
            Complete your profile to unlock all features and improve your experience.
          </p>
          
          {completion.missing_fields.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Missing information:</p>
              <ul className="space-y-1">
                {completion.missing_fields.map((field) => (
                  <li key={field} className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {getFieldLabel(field)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={loadCompletion}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Refresh Status
        </button>
      </div>
    </div>
  );
};

export default ProfileCompletion;
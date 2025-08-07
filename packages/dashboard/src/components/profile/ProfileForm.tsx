import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Form } from '../ui/Form';
import { Input } from '../ui/Input';
import { FormContainer } from '../ui/FormContainer';
import { FormFieldGroup, PersonalInfoFieldGroup, ContactInfoFieldGroup } from '../ui/FormFieldGroup';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { api } from '../../lib/api';
import { Toast } from '../ui';

interface ProfileData {
  first_name?: string;
  last_name?: string;
  display_name?: string;
  bio?: string;
  phone?: string;
  timezone?: string;
  language?: string;
  avatar_url?: string;
}

interface ProfileFormProps {
  onProfileUpdate?: (profile: ProfileData) => void;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ onProfileUpdate }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Timezone options
  const timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time' },
    { value: 'America/Chicago', label: 'Central Time' },
    { value: 'America/Denver', label: 'Mountain Time' },
    { value: 'America/Los_Angeles', label: 'Pacific Time' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Europe/Berlin', label: 'Berlin' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Asia/Shanghai', label: 'Shanghai' },
    { value: 'Australia/Sydney', label: 'Sydney' },
  ];

  // Language options
  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
    { value: 'zh', label: 'Chinese' },
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/profile');
      
      if (response.data.success) {
        setProfile(response.data.data);
      } else {
        setToast({ message: 'Failed to load profile', type: 'error' });
      }
    } catch (error) {
      console.error('Load profile error:', error);
      setToast({ message: 'Failed to load profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      const response = await api.put('/profile', profile);
      
      if (response.data.success) {
        setToast({ message: 'Profile updated successfully', type: 'success' });
        onProfileUpdate?.(response.data.data);
      } else {
        setToast({ message: 'Failed to update profile', type: 'error' });
      }
    } catch (error) {
      console.error('Update profile error:', error);
      setToast({ message: 'Failed to update profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setToast({ message: 'Please select an image file', type: 'error' });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setToast({ message: 'Image must be smaller than 5MB', type: 'error' });
      return;
    }

    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.post('/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setProfile(prev => ({
          ...prev,
          avatar_url: response.data.data.avatar_url,
        }));
        setToast({ message: 'Avatar updated successfully', type: 'success' });
      } else {
        setToast({ message: 'Failed to update avatar', type: 'error' });
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      setToast({ message: 'Failed to update avatar', type: 'error' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfile(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <FormContainer maxWidth="lg" centered={false}>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <Form onSubmit={handleSubmit}>
        {/* Avatar Section */}
        <FormFieldGroup
          title="Profile Picture"
          description="Upload a profile picture to personalize your account"
          layout="single"
          divider
        >
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-2xl font-semibold text-gray-500">
                    {profile.display_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
              </div>
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <LoadingSpinner size="sm" />
                </div>
              )}
            </div>
            <div>
              <label className="block">
                <span className="sr-only">Choose avatar</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </label>
              <p className="text-sm text-gray-500 mt-1">
                JPG, PNG or GIF. Max size 5MB.
              </p>
            </div>
          </div>
        </FormFieldGroup>

        {/* Personal Information */}
        <PersonalInfoFieldGroup>
          <Input
            label="First Name"
            type="text"
            value={profile.first_name || ''}
            onChange={(e) => handleInputChange('first_name', e.target.value)}
            placeholder="Enter your first name"
          />

          <Input
            label="Last Name"
            type="text"
            value={profile.last_name || ''}
            onChange={(e) => handleInputChange('last_name', e.target.value)}
            placeholder="Enter your last name"
          />

          <div className="sm:col-span-2">
            <Input
              label="Display Name"
              type="text"
              value={profile.display_name || ''}
              onChange={(e) => handleInputChange('display_name', e.target.value)}
              placeholder="How you'd like to be displayed"
            />
          </div>
        </PersonalInfoFieldGroup>

        {/* About Section */}
        <FormFieldGroup
          title="About"
          description="Tell others about yourself"
          layout="single"
          divider
        >
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            <textarea
              id="bio"
              rows={4}
              value={profile.bio || ''}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Tell us about yourself..."
              maxLength={500}
            />
            <p className="text-sm text-gray-500 mt-1">
              {profile.bio?.length || 0}/500 characters
            </p>
          </div>
        </FormFieldGroup>

        {/* Contact Information */}
        <ContactInfoFieldGroup>
          <Input
            label="Phone Number"
            type="tel"
            value={profile.phone || ''}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="Enter your phone number"
          />
        </ContactInfoFieldGroup>

        {/* Preferences */}
        <FormFieldGroup
          title="Preferences"
          description="Customize your experience"
          layout="two-column"
          divider
        >
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
              Timezone
            </label>
            <select
              id="timezone"
              value={profile.timezone || 'UTC'}
              onChange={(e) => handleInputChange('timezone', e.target.value)}
              className="w-full h-11 px-4 py-3 text-base border border-gray-300 bg-white rounded-lg shadow-sm transition-all duration-200
                hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60
                sm:h-12 sm:px-4 sm:py-3"
            >
              {timezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
              Language
            </label>
            <select
              id="language"
              value={profile.language || 'en'}
              onChange={(e) => handleInputChange('language', e.target.value)}
              className="w-full h-11 px-4 py-3 text-base border border-gray-300 bg-white rounded-lg shadow-sm transition-all duration-200
                hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60
                sm:h-12 sm:px-4 sm:py-3"
            >
              {languages.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </FormFieldGroup>

        {/* Submit Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <Button
            type="submit"
            disabled={saving}
            size="lg"
            className="px-8"
          >
            {saving ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </Form>
    </FormContainer>
  );
};

export default ProfileForm;
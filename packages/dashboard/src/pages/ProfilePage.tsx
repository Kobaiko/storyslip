import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  User, 
  Mail, 
  Lock, 
  Camera, 
  Save, 
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Settings,
  Shield
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Form, FormField, FormActions } from '../components/ui/Form';
import { FormContainer } from '../components/ui/FormContainer';
import { FormFieldGroup } from '../components/ui/FormFieldGroup';
import { LoadingState } from '../components/ui/LoadingSpinner';
import { useToast } from '../components/ui/Toast';
import { useCurrentUser, useUpdateProfile, useChangePassword } from '../hooks/useUsers';
import ProfileForm from '../components/profile/ProfileForm';
import ProfileCompletion from '../components/profile/ProfileCompletion';

// Validation schemas
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
});

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

const ProfilePage: React.FC = () => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const { data: user, isLoading, error } = useCurrentUser();
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();
  const { success, error: showError } = useToast();

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  });

  // Password form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  // Update form values when user data loads
  React.useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name,
        email: user.email,
      });
    }
  }, [user, profileForm]);

  const handleProfileSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfileMutation.mutateAsync({
        name: data.name,
        email: data.email,
        ...(avatarPreview && { avatar_url: avatarPreview }),
      });
      success('Profile updated successfully');
    } catch (error: any) {
      showError(error.message || 'Failed to update profile');
    }
  };

  const handlePasswordSubmit = async (data: PasswordFormData) => {
    try {
      await changePasswordMutation.mutateAsync({
        current_password: data.current_password,
        new_password: data.new_password,
      });
      success('Password changed successfully');
      passwordForm.reset();
    } catch (error: any) {
      showError(error.message || 'Failed to change password');
    }
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showError('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showError('Image must be less than 5MB');
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences</p>
      </div>

      <LoadingState
        loading={isLoading}
        error={error}
        isEmpty={!user}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ProfileForm onProfileUpdate={() => {
                  // Refresh user data or show success message
                  success('Profile updated successfully');
                }} />
              </CardContent>
            </Card>
          </div>

          {/* Profile Completion & Account Info */}
          <div className="space-y-6">
            {/* Profile Completion */}
            <ProfileCompletion onComplete={() => {
              success('Profile completed! All features are now available.');
            }} />

            {/* Account Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Account Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Account Status */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Account Status</h4>
                        <p className="text-sm text-gray-500">
                          Your account is active and verified
                        </p>
                      </div>
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="h-5 w-5 mr-1" />
                        <span className="text-sm font-medium">Verified</span>
                      </div>
                    </div>
                  </div>

                  {/* Account Info */}
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Role</label>
                      <p className="text-sm text-gray-900 capitalize">{user?.role}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-700">Member Since</label>
                      <p className="text-sm text-gray-900">
                        {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">Last Login</label>
                      <p className="text-sm text-gray-900">
                        {user?.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        // Scroll to password section or open modal
                        document.getElementById('password-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Change Password
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Change Password Section */}
        <Card id="password-section">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormContainer maxWidth="md" centered={false}>
              <Form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)}>
                <FormFieldGroup layout="single" spacing="normal">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-yellow-800">Password Requirements</h4>
                        <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                          <li>• At least 8 characters long</li>
                          <li>• Include uppercase and lowercase letters</li>
                          <li>• Include at least one number</li>
                          <li>• Include at least one special character</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <FormField>
                    <div className="relative">
                      <Input
                        label="Current Password"
                        type={showCurrentPassword ? 'text' : 'password'}
                        {...passwordForm.register('current_password')}
                        error={passwordForm.formState.errors.current_password?.message}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormField>

                  <FormField>
                    <div className="relative">
                      <Input
                        label="New Password"
                        type={showNewPassword ? 'text' : 'password'}
                        {...passwordForm.register('new_password')}
                        error={passwordForm.formState.errors.new_password?.message}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormField>

                  <FormField>
                    <div className="relative">
                      <Input
                        label="Confirm New Password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...passwordForm.register('confirm_password')}
                        error={passwordForm.formState.errors.confirm_password?.message}
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormField>

                  <FormActions>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => passwordForm.reset()}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="lg"
                      loading={changePasswordMutation.isPending}
                    >
                      Update Password
                    </Button>
                  </FormActions>
                </FormFieldGroup>
              </Form>
            </FormContainer>
          </CardContent>
        </Card>
      </LoadingState>
    </div>
  );
};

export { ProfilePage };
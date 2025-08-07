import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PasswordStrengthIndicator } from '../../components/auth/PasswordStrengthIndicator';
import { SplitScreenAuthLayout } from '../../components/auth/SplitScreenAuthLayout';
import { ProductPreview } from '../../components/auth/ProductPreview';
import { AuthPanel } from '../../components/auth/AuthPanel';
import { urls } from '../../config/app';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const RegisterPage: React.FC = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password', '');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await registerUser(data.email, data.password, data.name);
      setSuccess('Registration successful! Please check your email to verify your account before signing in.');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SplitScreenAuthLayout preview={<ProductPreview />}>
      <AuthPanel 
        title="Create your account"
        subtitle="Start managing your embeddable content today"
      >
        {/* Back to marketing link */}
        <div className="mb-6">
          <a
            href={urls.marketing}
            className="inline-flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to StorySlip.com</span>
          </a>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Account Information */}
          <div className="space-y-4">
            <Input
              label="Full name"
              type="text"
              autoComplete="name"
              size="md"
              placeholder="Enter your full name"
              {...register('name')}
              error={errors.name?.message}
            />

            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              size="md"
              placeholder="Enter your email address"
              {...register('email')}
              error={errors.email?.message}
            />
          </div>

          {/* Password Section */}
          <div className="space-y-4">
            <div>
              <Input
                label="Password"
                type="password"
                autoComplete="new-password"
                size="md"
                placeholder="Create a strong password"
                {...register('password')}
                error={errors.password?.message}
              />
              {password && (
                <div className="mt-2">
                  <PasswordStrengthIndicator password={password} />
                </div>
              )}
            </div>

            <Input
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              size="md"
              placeholder="Confirm your password"
              {...register('confirmPassword')}
              error={errors.confirmPassword?.message}
            />
          </div>

          {/* Terms Agreement */}
          <div className="flex items-start space-x-3">
            <input
              id="agree-terms"
              name="agree-terms"
              type="checkbox"
              required
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
            />
            <label htmlFor="agree-terms" className="text-sm text-gray-700 leading-relaxed">
              I agree to the{' '}
              <Link to="/terms" className="text-blue-600 hover:text-blue-500 underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-blue-600 hover:text-blue-500 underline">
                Privacy Policy
              </Link>
            </label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={isLoading}
            disabled={isLoading}
          >
            Create account
          </Button>
        </form>

        {/* Sign In Link */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Already have an account?</span>
            </div>
          </div>

          <div className="mt-6">
            <Link
              to="/login"
              className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Sign in instead
            </Link>
          </div>
        </div>
      </AuthPanel>
    </SplitScreenAuthLayout>
  );
};

export { RegisterPage };
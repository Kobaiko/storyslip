import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Logo } from '../../components/ui/Logo';
import { Form, FormField, FormFieldGroup } from '../../components/ui/Form';
import { urls } from '../../config/app';
import { apiClient } from '../../lib/api';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

const ForgotPasswordPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient.post('/auth/request-password-reset', {
        email: data.email,
      });

      if (response.success) {
        setSuccess('If an account with that email exists, a password reset link has been sent.');
      } else {
        setError(response.error?.message || 'Failed to send reset email. Please try again.');
      }
    } catch (err: any) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Back to marketing link */}
        <div className="text-center">
          <a
            href={urls.marketing}
            className="inline-flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to StorySlip.com</span>
          </a>
        </div>

        {/* Logo and title */}
        <div className="text-center">
          <div className="mx-auto">
            <Logo size="xl" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Reset your password
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Forgot your password?</CardTitle>
            <CardDescription>
              No worries, we'll send you reset instructions
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Form onSubmit={handleSubmit(onSubmit)} layout="responsive" maxWidth="full" spacing="normal">
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

              {/* Email Input */}
              <FormFieldGroup layout="single" spacing="normal">
                <FormField required error={errors.email?.message}>
                  <Input
                    label="Email address"
                    type="email"
                    autoComplete="email"
                    size="md"
                    placeholder="Enter your email address"
                    {...register('email')}
                    error={errors.email?.message}
                  />
                </FormField>
              </FormFieldGroup>

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                size="lg"
                loading={isLoading}
                disabled={isLoading}
              >
                Send reset link
              </Button>
            </Form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Remember your password?</span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  to="/login"
                  className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Back to sign in
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export { ForgotPasswordPage };
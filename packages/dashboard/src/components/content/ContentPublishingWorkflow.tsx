import React, { useState } from 'react';
import { 
  Send, 
  Calendar, 
  Eye, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Users, 
  Globe,
  ArrowRight,
  X
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal, useModal } from '../ui/Modal';
import { Input, Textarea, Select } from '../ui/Form';
import { useToast } from '../ui/Toast';
import { Content } from '../../hooks/useContent';
import { formatDate } from '../../lib/utils';

interface ContentPublishingWorkflowProps {
  content: Content;
  onPublish: (options: PublishOptions) => Promise<void>;
  onSchedule: (options: ScheduleOptions) => Promise<void>;
  onSubmitForReview: (options: ReviewOptions) => Promise<void>;
  onPreview: () => void;
  loading?: boolean;
}

interface PublishOptions {
  publishNow: boolean;
  notifySubscribers?: boolean;
  socialMediaShare?: boolean;
  seoOptimized?: boolean;
}

interface ScheduleOptions {
  scheduledAt: string;
  timezone: string;
  notifySubscribers?: boolean;
  socialMediaShare?: boolean;
}

interface ReviewOptions {
  reviewers: string[];
  message?: string;
  deadline?: string;
}

export function ContentPublishingWorkflow({
  content,
  onPublish,
  onSchedule,
  onSubmitForReview,
  onPreview,
  loading = false,
}: ContentPublishingWorkflowProps) {
  const [publishOptions, setPublishOptions] = useState<PublishOptions>({
    publishNow: true,
    notifySubscribers: true,
    socialMediaShare: false,
    seoOptimized: true,
  });

  const [scheduleOptions, setScheduleOptions] = useState<ScheduleOptions>({
    scheduledAt: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    notifySubscribers: true,
    socialMediaShare: false,
  });

  const [reviewOptions, setReviewOptions] = useState<ReviewOptions>({
    reviewers: [],
    message: '',
    deadline: '',
  });

  const publishModal = useModal();
  const scheduleModal = useModal();
  const reviewModal = useModal();
  const { success, error: showError } = useToast();

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'draft':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          title: 'Draft',
          description: 'This content is still being worked on and is not visible to the public.',
        };
      case 'review':
        return {
          icon: Eye,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          title: 'Under Review',
          description: 'This content is being reviewed by team members before publication.',
        };
      case 'scheduled':
        return {
          icon: Clock,
          color: 'text-purple-600',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200',
          title: 'Scheduled',
          description: `This content is scheduled to be published on ${formatDate(content.scheduled_at!)}.`,
        };
      case 'published':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          title: 'Published',
          description: `This content was published on ${formatDate(content.published_at!)}.`,
        };
      default:
        return {
          icon: AlertTriangle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          title: 'Unknown',
          description: 'Status unknown.',
        };
    }
  };

  const statusInfo = getStatusInfo(content.status);
  const StatusIcon = statusInfo.icon;

  const handlePublish = async () => {
    try {
      await onPublish(publishOptions);
      success('Content published successfully!');
      publishModal.close();
    } catch (error: any) {
      showError(error.message || 'Failed to publish content');
    }
  };

  const handleSchedule = async () => {
    try {
      await onSchedule(scheduleOptions);
      success('Content scheduled successfully!');
      scheduleModal.close();
    } catch (error: any) {
      showError(error.message || 'Failed to schedule content');
    }
  };

  const handleSubmitForReview = async () => {
    try {
      await onSubmitForReview(reviewOptions);
      success('Content submitted for review!');
      reviewModal.close();
    } catch (error: any) {
      showError(error.message || 'Failed to submit for review');
    }
  };

  const getAvailableActions = () => {
    const actions = [];

    switch (content.status) {
      case 'draft':
        actions.push(
          {
            key: 'publish',
            label: 'Publish Now',
            icon: Send,
            variant: 'primary' as const,
            onClick: publishModal.open,
          },
          {
            key: 'schedule',
            label: 'Schedule',
            icon: Calendar,
            variant: 'outline' as const,
            onClick: scheduleModal.open,
          },
          {
            key: 'review',
            label: 'Submit for Review',
            icon: Users,
            variant: 'outline' as const,
            onClick: reviewModal.open,
          }
        );
        break;

      case 'review':
        actions.push(
          {
            key: 'publish',
            label: 'Approve & Publish',
            icon: Send,
            variant: 'primary' as const,
            onClick: publishModal.open,
          },
          {
            key: 'schedule',
            label: 'Approve & Schedule',
            icon: Calendar,
            variant: 'outline' as const,
            onClick: scheduleModal.open,
          }
        );
        break;

      case 'scheduled':
        actions.push(
          {
            key: 'publish',
            label: 'Publish Now',
            icon: Send,
            variant: 'primary' as const,
            onClick: publishModal.open,
          }
        );
        break;

      case 'published':
        actions.push(
          {
            key: 'unpublish',
            label: 'Unpublish',
            icon: X,
            variant: 'outline' as const,
            onClick: () => {
              // Handle unpublish
            },
          }
        );
        break;
    }

    // Always add preview action
    actions.push({
      key: 'preview',
      label: 'Preview',
      icon: Eye,
      variant: 'ghost' as const,
      onClick: onPreview,
    });

    return actions;
  };

  const availableActions = getAvailableActions();

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card className={`${statusInfo.bgColor} ${statusInfo.borderColor} border-2`}>
        <CardContent className="p-6">
          <div className="flex items-start space-x-4">
            <div className={`p-2 rounded-full ${statusInfo.bgColor}`}>
              <StatusIcon className={`h-6 w-6 ${statusInfo.color}`} />
            </div>
            <div className="flex-1">
              <h3 className={`text-lg font-semibold ${statusInfo.color}`}>
                {statusInfo.title}
              </h3>
              <p className="text-gray-600 mt-1">
                {statusInfo.description}
              </p>
              
              {content.status === 'scheduled' && content.scheduled_at && (
                <div className="mt-3">
                  <Badge variant="warning">
                    Scheduled for {formatDate(content.scheduled_at)}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Readiness Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Publishing Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <CheckCircle className={`h-5 w-5 ${content.title ? 'text-green-600' : 'text-gray-400'}`} />
              <span className={content.title ? 'text-gray-900' : 'text-gray-500'}>
                Title is set
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className={`h-5 w-5 ${content.body ? 'text-green-600' : 'text-gray-400'}`} />
              <span className={content.body ? 'text-gray-900' : 'text-gray-500'}>
                Content body is written
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className={`h-5 w-5 ${content.excerpt ? 'text-green-600' : 'text-gray-400'}`} />
              <span className={content.excerpt ? 'text-gray-900' : 'text-gray-500'}>
                Excerpt is provided
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className={`h-5 w-5 ${content.seo_title ? 'text-green-600' : 'text-gray-400'}`} />
              <span className={content.seo_title ? 'text-gray-900' : 'text-gray-500'}>
                SEO title is optimized
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className={`h-5 w-5 ${content.featured_image_url ? 'text-green-600' : 'text-gray-400'}`} />
              <span className={content.featured_image_url ? 'text-gray-900' : 'text-gray-500'}>
                Featured image is set
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <CheckCircle className={`h-5 w-5 ${content.categories && content.categories.length > 0 ? 'text-green-600' : 'text-gray-400'}`} />
              <span className={content.categories && content.categories.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
                Categories are assigned
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Publishing Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {availableActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <Button
                  key={action.key}
                  variant={action.variant}
                  onClick={action.onClick}
                  leftIcon={<ActionIcon className="h-4 w-4" />}
                  loading={loading}
                >
                  {action.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Publish Modal */}
      <Modal
        isOpen={publishModal.isOpen}
        onClose={publishModal.close}
        title="Publish Content"
        size="md"
      >
        <div className="p-6 space-y-4">
          <p className="text-gray-600">
            Are you ready to publish "{content.title}"? This will make it visible to all visitors.
          </p>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={publishOptions.notifySubscribers}
                onChange={(e) => setPublishOptions({
                  ...publishOptions,
                  notifySubscribers: e.target.checked,
                })}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Notify subscribers</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={publishOptions.socialMediaShare}
                onChange={(e) => setPublishOptions({
                  ...publishOptions,
                  socialMediaShare: e.target.checked,
                })}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Share on social media</span>
            </label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={publishModal.close}>
              Cancel
            </Button>
            <Button onClick={handlePublish} loading={loading}>
              Publish Now
            </Button>
          </div>
        </div>
      </Modal>

      {/* Schedule Modal */}
      <Modal
        isOpen={scheduleModal.isOpen}
        onClose={scheduleModal.close}
        title="Schedule Content"
        size="md"
      >
        <div className="p-6 space-y-4">
          <Input
            label="Schedule Date & Time"
            type="datetime-local"
            value={scheduleOptions.scheduledAt}
            onChange={(e) => setScheduleOptions({
              ...scheduleOptions,
              scheduledAt: e.target.value,
            })}
            required
          />
          
          <Select
            label="Timezone"
            value={scheduleOptions.timezone}
            onChange={(e) => setScheduleOptions({
              ...scheduleOptions,
              timezone: e.target.value,
            })}
            options={[
              { value: 'America/New_York', label: 'Eastern Time' },
              { value: 'America/Chicago', label: 'Central Time' },
              { value: 'America/Denver', label: 'Mountain Time' },
              { value: 'America/Los_Angeles', label: 'Pacific Time' },
              { value: 'UTC', label: 'UTC' },
            ]}
          />
          
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={scheduleOptions.notifySubscribers}
                onChange={(e) => setScheduleOptions({
                  ...scheduleOptions,
                  notifySubscribers: e.target.checked,
                })}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Notify subscribers when published</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={scheduleOptions.socialMediaShare}
                onChange={(e) => setScheduleOptions({
                  ...scheduleOptions,
                  socialMediaShare: e.target.checked,
                })}
                className="rounded border-gray-300"
              />
              <span className="text-sm">Share on social media when published</span>
            </label>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={scheduleModal.close}>
              Cancel
            </Button>
            <Button 
              onClick={handleSchedule} 
              loading={loading}
              disabled={!scheduleOptions.scheduledAt}
            >
              Schedule Content
            </Button>
          </div>
        </div>
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={reviewModal.isOpen}
        onClose={reviewModal.close}
        title="Submit for Review"
        size="md"
      >
        <div className="p-6 space-y-4">
          <p className="text-gray-600">
            Submit "{content.title}" for review by team members.
          </p>
          
          <Select
            label="Reviewers"
            value=""
            onChange={(e) => {
              if (e.target.value && !reviewOptions.reviewers.includes(e.target.value)) {
                setReviewOptions({
                  ...reviewOptions,
                  reviewers: [...reviewOptions.reviewers, e.target.value],
                });
              }
            }}
            options={[
              { value: '', label: 'Select reviewers...' },
              { value: 'john@example.com', label: 'John Doe' },
              { value: 'jane@example.com', label: 'Jane Smith' },
              { value: 'editor@example.com', label: 'Chief Editor' },
            ]}
          />
          
          {reviewOptions.reviewers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {reviewOptions.reviewers.map((reviewer) => (
                <Badge key={reviewer} variant="secondary">
                  {reviewer}
                  <button
                    onClick={() => setReviewOptions({
                      ...reviewOptions,
                      reviewers: reviewOptions.reviewers.filter(r => r !== reviewer),
                    })}
                    className="ml-1 text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          
          <Textarea
            label="Message (Optional)"
            placeholder="Add a message for the reviewers..."
            value={reviewOptions.message}
            onChange={(e) => setReviewOptions({
              ...reviewOptions,
              message: e.target.value,
            })}
            rows={3}
          />
          
          <Input
            label="Review Deadline (Optional)"
            type="date"
            value={reviewOptions.deadline}
            onChange={(e) => setReviewOptions({
              ...reviewOptions,
              deadline: e.target.value,
            })}
          />
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={reviewModal.close}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitForReview} 
              loading={loading}
              disabled={reviewOptions.reviewers.length === 0}
            >
              Submit for Review
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
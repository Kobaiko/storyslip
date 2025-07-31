import React, { useState } from 'react';
import { Calendar, Clock, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Form';
import { Badge } from '../ui/Badge';
import { Modal, useModal } from '../ui/Modal';
import { useToast } from '../ui/Toast';
import { formatDate, formatDateTime } from '../../lib/utils';

interface ScheduledContent {
  id: string;
  title: string;
  scheduled_at: string;
  status: 'scheduled' | 'published' | 'failed';
  author: string;
  category?: string;
}

interface ContentSchedulerProps {
  scheduledContent: ScheduledContent[];
  onSchedule: (contentId: string, scheduledAt: string) => Promise<void>;
  onReschedule: (contentId: string, scheduledAt: string) => Promise<void>;
  onCancelSchedule: (contentId: string) => Promise<void>;
  onPublishNow: (contentId: string) => Promise<void>;
}

export function ContentScheduler({
  scheduledContent,
  onSchedule,
  onReschedule,
  onCancelSchedule,
  onPublishNow,
}: ContentSchedulerProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedContent, setSelectedContent] = useState<ScheduledContent | null>(null);
  const [view, setView] = useState<'calendar' | 'list'>('list');

  const scheduleModal = useModal();
  const rescheduleModal = useModal();
  const { success, error: showError } = useToast();

  const handleSchedule = async () => {
    if (!selectedContent || !selectedDate || !selectedTime) return;

    try {
      const scheduledAt = `${selectedDate}T${selectedTime}:00`;
      await onSchedule(selectedContent.id, scheduledAt);
      success('Content scheduled successfully');
      scheduleModal.close();
      setSelectedContent(null);
      setSelectedDate('');
      setSelectedTime('');
    } catch (error: any) {
      showError(error.message || 'Failed to schedule content');
    }
  };

  const handleReschedule = async () => {
    if (!selectedContent || !selectedDate || !selectedTime) return;

    try {
      const scheduledAt = `${selectedDate}T${selectedTime}:00`;
      await onReschedule(selectedContent.id, scheduledAt);
      success('Content rescheduled successfully');
      rescheduleModal.close();
      setSelectedContent(null);
      setSelectedDate('');
      setSelectedTime('');
    } catch (error: any) {
      showError(error.message || 'Failed to reschedule content');
    }
  };

  const handleCancelSchedule = async (content: ScheduledContent) => {
    try {
      await onCancelSchedule(content.id);
      success('Schedule cancelled successfully');
    } catch (error: any) {
      showError(error.message || 'Failed to cancel schedule');
    }
  };

  const handlePublishNow = async (content: ScheduledContent) => {
    try {
      await onPublishNow(content.id);
      success('Content published successfully');
    } catch (error: any) {
      showError(error.message || 'Failed to publish content');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'published':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'scheduled': return 'warning';
      case 'published': return 'success';
      case 'failed': return 'error';
      default: return 'secondary';
    }
  };

  const groupContentByDate = (content: ScheduledContent[]) => {
    const grouped: Record<string, ScheduledContent[]> = {};
    
    content.forEach(item => {
      const date = new Date(item.scheduled_at).toDateString();
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(item);
    });

    return grouped;
  };

  const groupedContent = groupContentByDate(scheduledContent);
  const sortedDates = Object.keys(groupedContent).sort((a, b) => 
    new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Content Scheduler</h2>
          <p className="text-gray-600">Manage scheduled content publishing</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('list')}
          >
            List View
          </Button>
          <Button
            variant={view === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('calendar')}
          >
            Calendar View
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">
                  {scheduledContent.filter(c => c.status === 'scheduled').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Published</p>
                <p className="text-2xl font-bold text-gray-900">
                  {scheduledContent.filter(c => c.status === 'published').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {scheduledContent.filter(c => c.status === 'failed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900">
                  {scheduledContent.filter(c => {
                    const scheduledDate = new Date(c.scheduled_at);
                    const now = new Date();
                    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    return scheduledDate >= now && scheduledDate <= weekFromNow;
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content List */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Content</CardTitle>
        </CardHeader>
        <CardContent>
          {scheduledContent.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No scheduled content
              </h3>
              <p className="text-gray-500">
                Schedule content to publish automatically at specific times.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedDates.map(date => (
                <div key={date}>
                  <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    {formatDate(date)}
                  </h3>
                  
                  <div className="space-y-3">
                    {groupedContent[date]
                      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                      .map(content => (
                        <div
                          key={content.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center space-x-4">
                            {getStatusIcon(content.status)}
                            
                            <div>
                              <h4 className="font-medium text-gray-900">
                                {content.title}
                              </h4>
                              <div className="flex items-center space-x-4 mt-1">
                                <span className="text-sm text-gray-500">
                                  {formatDateTime(content.scheduled_at)}
                                </span>
                                <span className="text-sm text-gray-500">
                                  by {content.author}
                                </span>
                                {content.category && (
                                  <Badge variant="secondary" size="sm">
                                    {content.category}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Badge variant={getStatusBadgeVariant(content.status)}>
                              {content.status.charAt(0).toUpperCase() + content.status.slice(1)}
                            </Badge>

                            {content.status === 'scheduled' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedContent(content);
                                    const scheduledDate = new Date(content.scheduled_at);
                                    setSelectedDate(scheduledDate.toISOString().split('T')[0]);
                                    setSelectedTime(scheduledDate.toTimeString().slice(0, 5));
                                    rescheduleModal.open();
                                  }}
                                >
                                  Reschedule
                                </Button>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePublishNow(content)}
                                  leftIcon={<Send className="h-4 w-4" />}
                                >
                                  Publish Now
                                </Button>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancelSchedule(content)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  Cancel
                                </Button>
                              </>
                            )}

                            {content.status === 'failed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedContent(content);
                                  const now = new Date();
                                  setSelectedDate(now.toISOString().split('T')[0]);
                                  setSelectedTime(now.toTimeString().slice(0, 5));
                                  rescheduleModal.open();
                                }}
                              >
                                Retry
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Modal */}
      <Modal
        isOpen={scheduleModal.isOpen}
        onClose={() => {
          scheduleModal.close();
          setSelectedContent(null);
          setSelectedDate('');
          setSelectedTime('');
        }}
        title="Schedule Content"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">
              {selectedContent?.title}
            </h3>
            <p className="text-sm text-gray-600">
              Choose when this content should be published.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
            
            <Input
              label="Time"
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                scheduleModal.close();
                setSelectedContent(null);
                setSelectedDate('');
                setSelectedTime('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSchedule}
              disabled={!selectedDate || !selectedTime}
              leftIcon={<Calendar className="h-4 w-4" />}
            >
              Schedule
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        isOpen={rescheduleModal.isOpen}
        onClose={() => {
          rescheduleModal.close();
          setSelectedContent(null);
          setSelectedDate('');
          setSelectedTime('');
        }}
        title="Reschedule Content"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">
              {selectedContent?.title}
            </h3>
            <p className="text-sm text-gray-600">
              Choose a new time for this content to be published.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
            
            <Input
              label="Time"
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                rescheduleModal.close();
                setSelectedContent(null);
                setSelectedDate('');
                setSelectedTime('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              disabled={!selectedDate || !selectedTime}
              leftIcon={<Calendar className="h-4 w-4" />}
            >
              Reschedule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
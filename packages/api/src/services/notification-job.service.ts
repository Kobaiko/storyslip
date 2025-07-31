import { supabase } from '../config/supabase';
import { logger } from '../middleware/logger';
import { emailNotificationOrchestratorService } from './email-notification-orchestrator.service';
import { ApiError } from '../utils/response';

export interface NotificationJob {
  id: string;
  type: 'daily_digest' | 'weekly_digest' | 'cleanup' | 'process_queue';
  status: 'pending' | 'running' | 'completed' | 'failed';
  scheduled_for: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  metadata?: Record<string, any>;
}

export class NotificationJobService {
  private isRunning = false;
  private jobInterval: NodeJS.Timeout | null = null;

  /**
   * Start the notification job processor
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Notification job service is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting notification job service');

    // Process jobs every minute
    this.jobInterval = setInterval(() => {
      this.processJobs().catch(error => {
        logger.error('Error processing notification jobs:', error);
      });
    }, 60 * 1000);

    // Schedule recurring jobs
    this.scheduleRecurringJobs().catch(error => {
      logger.error('Error scheduling recurring jobs:', error);
    });
  }

  /**
   * Stop the notification job processor
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logger.info('Stopping notification job service');

    if (this.jobInterval) {
      clearInterval(this.jobInterval);
      this.jobInterval = null;
    }
  }

  /**
   * Process pending jobs
   */
  private async processJobs(): Promise<void> {
    try {
      // Get pending jobs that are due
      const { data: jobs, error } = await supabase
        .from('notification_jobs')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true })
        .limit(10);

      if (error) {
        throw error;
      }

      if (!jobs || jobs.length === 0) {
        return;
      }

      logger.info(`Processing ${jobs.length} notification jobs`);

      // Process each job
      for (const job of jobs) {
        await this.processJob(job);
      }
    } catch (error) {
      logger.error('Failed to process notification jobs:', error);
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: NotificationJob): Promise<void> {
    try {
      // Mark job as running
      await this.updateJobStatus(job.id, 'running', {
        started_at: new Date().toISOString(),
      });

      logger.info(`Processing notification job: ${job.type} (${job.id})`);

      // Execute job based on type
      switch (job.type) {
        case 'daily_digest':
          await this.processDailyDigestJob(job);
          break;
        case 'weekly_digest':
          await this.processWeeklyDigestJob(job);
          break;
        case 'cleanup':
          await this.processCleanupJob(job);
          break;
        case 'process_queue':
          await this.processQueueJob(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      // Mark job as completed
      await this.updateJobStatus(job.id, 'completed', {
        completed_at: new Date().toISOString(),
      });

      logger.info(`Completed notification job: ${job.type} (${job.id})`);
    } catch (error) {
      logger.error(`Failed to process job ${job.id}:`, error);

      // Mark job as failed
      await this.updateJobStatus(job.id, 'failed', {
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Process daily digest job
   */
  private async processDailyDigestJob(job: NotificationJob): Promise<void> {
    const { user_ids } = job.metadata || {};

    if (user_ids && Array.isArray(user_ids)) {
      // Process specific users
      for (const userId of user_ids) {
        try {
          await emailNotificationOrchestratorService.sendDailyDigest(userId);
        } catch (error) {
          logger.error(`Failed to send daily digest to user ${userId}:`, error);
        }
      }
    } else {
      // Process all users with daily digest enabled
      const { data: users, error } = await supabase
        .from('user_notification_preferences')
        .select('user_id')
        .eq('email_enabled', true)
        .contains('frequency', { daily_digest: true });

      if (error) {
        throw error;
      }

      if (users) {
        for (const user of users) {
          try {
            await emailNotificationOrchestratorService.sendDailyDigest(user.user_id);
          } catch (error) {
            logger.error(`Failed to send daily digest to user ${user.user_id}:`, error);
          }
        }
      }
    }
  }

  /**
   * Process weekly digest job
   */\n  private async processWeeklyDigestJob(job: NotificationJob): Promise<void> {\n    const { user_ids } = job.metadata || {};\n\n    if (user_ids && Array.isArray(user_ids)) {\n      // Process specific users\n      for (const userId of user_ids) {\n        try {\n          await emailNotificationOrchestratorService.sendWeeklyDigest(userId);\n        } catch (error) {\n          logger.error(`Failed to send weekly digest to user ${userId}:`, error);\n        }\n      }\n    } else {\n      // Process all users with weekly digest enabled\n      const { data: users, error } = await supabase\n        .from('user_notification_preferences')\n        .select('user_id')\n        .eq('email_enabled', true)\n        .contains('frequency', { weekly_summary: true });\n\n      if (error) {\n        throw error;\n      }\n\n      if (users) {\n        for (const user of users) {\n          try {\n            await emailNotificationOrchestratorService.sendWeeklyDigest(user.user_id);\n          } catch (error) {\n            logger.error(`Failed to send weekly digest to user ${user.user_id}:`, error);\n          }\n        }\n      }\n    }\n  }\n\n  /**\n   * Process cleanup job\n   */\n  private async processCleanupJob(job: NotificationJob): Promise<void> {\n    const { history_retention_days = 90, queue_retention_days = 7 } = job.metadata || {};\n\n    const { data: deletedCount, error } = await supabase\n      .rpc('cleanup_old_notifications', {\n        history_retention_days,\n        queue_retention_days,\n      });\n\n    if (error) {\n      throw error;\n    }\n\n    logger.info(`Cleaned up ${deletedCount} old notification records`);\n  }\n\n  /**\n   * Process notification queue job\n   */\n  private async processQueueJob(job: NotificationJob): Promise<void> {\n    const { batch_size = 100 } = job.metadata || {};\n\n    const { data: processedCount, error } = await supabase\n      .rpc('process_notification_digest_queue', {\n        batch_size,\n      });\n\n    if (error) {\n      throw error;\n    }\n\n    logger.info(`Processed ${processedCount} queued notifications`);\n  }\n\n  /**\n   * Update job status\n   */\n  private async updateJobStatus(\n    jobId: string,\n    status: NotificationJob['status'],\n    updates: Partial<NotificationJob> = {}\n  ): Promise<void> {\n    const { error } = await supabase\n      .from('notification_jobs')\n      .update({\n        status,\n        ...updates,\n      })\n      .eq('id', jobId);\n\n    if (error) {\n      throw error;\n    }\n  }\n\n  /**\n   * Schedule recurring jobs\n   */\n  private async scheduleRecurringJobs(): Promise<void> {\n    const now = new Date();\n    const tomorrow = new Date(now);\n    tomorrow.setDate(tomorrow.getDate() + 1);\n    tomorrow.setHours(8, 0, 0, 0); // 8 AM\n\n    const nextWeek = new Date(now);\n    nextWeek.setDate(nextWeek.getDate() + (7 - nextWeek.getDay())); // Next Sunday\n    nextWeek.setHours(9, 0, 0, 0); // 9 AM\n\n    const nextCleanup = new Date(now);\n    nextCleanup.setDate(nextCleanup.getDate() + 1);\n    nextCleanup.setHours(2, 0, 0, 0); // 2 AM\n\n    const jobs = [\n      {\n        type: 'daily_digest',\n        scheduled_for: tomorrow.toISOString(),\n        metadata: {},\n      },\n      {\n        type: 'weekly_digest',\n        scheduled_for: nextWeek.toISOString(),\n        metadata: {},\n      },\n      {\n        type: 'cleanup',\n        scheduled_for: nextCleanup.toISOString(),\n        metadata: {\n          history_retention_days: 90,\n          queue_retention_days: 7,\n        },\n      },\n      {\n        type: 'process_queue',\n        scheduled_for: new Date(now.getTime() + 5 * 60 * 1000).toISOString(), // 5 minutes from now\n        metadata: {\n          batch_size: 100,\n        },\n      },\n    ];\n\n    for (const jobData of jobs) {\n      try {\n        // Check if job already exists\n        const { data: existingJob, error: checkError } = await supabase\n          .from('notification_jobs')\n          .select('id')\n          .eq('type', jobData.type)\n          .eq('status', 'pending')\n          .gte('scheduled_for', now.toISOString())\n          .single();\n\n        if (checkError && checkError.code !== 'PGRST116') {\n          throw checkError;\n        }\n\n        if (!existingJob) {\n          // Create new job\n          const { error: createError } = await supabase\n            .from('notification_jobs')\n            .insert({\n              ...jobData,\n              status: 'pending',\n            });\n\n          if (createError) {\n            throw createError;\n          }\n\n          logger.info(`Scheduled ${jobData.type} job for ${jobData.scheduled_for}`);\n        }\n      } catch (error) {\n        logger.error(`Failed to schedule ${jobData.type} job:`, error);\n      }\n    }\n  }\n\n  /**\n   * Schedule a custom job\n   */\n  async scheduleJob(\n    type: NotificationJob['type'],\n    scheduledFor: Date,\n    metadata: Record<string, any> = {}\n  ): Promise<string> {\n    try {\n      const { data: job, error } = await supabase\n        .from('notification_jobs')\n        .insert({\n          type,\n          status: 'pending',\n          scheduled_for: scheduledFor.toISOString(),\n          metadata,\n        })\n        .select('id')\n        .single();\n\n      if (error) {\n        throw error;\n      }\n\n      logger.info(`Scheduled ${type} job for ${scheduledFor.toISOString()}`);\n      return job.id;\n    } catch (error) {\n      logger.error(`Failed to schedule ${type} job:`, error);\n      throw new ApiError('Failed to schedule job', 500, 'JOB_SCHEDULE_ERROR', error);\n    }\n  }\n\n  /**\n   * Cancel a job\n   */\n  async cancelJob(jobId: string): Promise<void> {\n    try {\n      const { error } = await supabase\n        .from('notification_jobs')\n        .delete()\n        .eq('id', jobId)\n        .eq('status', 'pending');\n\n      if (error) {\n        throw error;\n      }\n\n      logger.info(`Cancelled job ${jobId}`);\n    } catch (error) {\n      logger.error(`Failed to cancel job ${jobId}:`, error);\n      throw new ApiError('Failed to cancel job', 500, 'JOB_CANCEL_ERROR', error);\n    }\n  }\n\n  /**\n   * Get job status\n   */\n  async getJobStatus(jobId: string): Promise<NotificationJob | null> {\n    try {\n      const { data: job, error } = await supabase\n        .from('notification_jobs')\n        .select('*')\n        .eq('id', jobId)\n        .single();\n\n      if (error && error.code !== 'PGRST116') {\n        throw error;\n      }\n\n      return job || null;\n    } catch (error) {\n      logger.error(`Failed to get job status for ${jobId}:`, error);\n      throw new ApiError('Failed to get job status', 500, 'JOB_STATUS_ERROR', error);\n    }\n  }\n\n  /**\n   * Get job history\n   */\n  async getJobHistory(\n    type?: NotificationJob['type'],\n    status?: NotificationJob['status'],\n    limit = 50,\n    offset = 0\n  ): Promise<NotificationJob[]> {\n    try {\n      let query = supabase\n        .from('notification_jobs')\n        .select('*')\n        .order('scheduled_for', { ascending: false })\n        .range(offset, offset + limit - 1);\n\n      if (type) {\n        query = query.eq('type', type);\n      }\n\n      if (status) {\n        query = query.eq('status', status);\n      }\n\n      const { data: jobs, error } = await query;\n\n      if (error) {\n        throw error;\n      }\n\n      return jobs || [];\n    } catch (error) {\n      logger.error('Failed to get job history:', error);\n      throw new ApiError('Failed to get job history', 500, 'JOB_HISTORY_ERROR', error);\n    }\n  }\n}\n\nexport const notificationJobService = new NotificationJobService();"
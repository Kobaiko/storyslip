import { contentService } from './content.service';
import { logger } from '../middleware/logger';
import cron from 'node-cron';

export class SchedulerService {
  private static instance: SchedulerService;
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

  private constructor() {}

  static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  /**
   * Initialize the scheduler service
   */
  init(): void {
    // Run every minute to check for scheduled content
    const task = cron.schedule('* * * * *', async () => {
      await this.processScheduledContent();
    }, {
      scheduled: false
    });

    this.scheduledTasks.set('content-publisher', task);
    task.start();

    logger.info('Content scheduler initialized');
  }

  /**
   * Stop the scheduler service
   */
  stop(): void {
    this.scheduledTasks.forEach((task, name) => {
      task.stop();
      task.destroy();
      logger.info(`Stopped scheduled task: ${name}`);
    });
    this.scheduledTasks.clear();
  }

  /**
   * Process scheduled content for publishing
   */
  private async processScheduledContent(): Promise<void> {
    try {
      await contentService.publishScheduledContent();
    } catch (error) {
      logger.error('Error processing scheduled content:', error);
    }
  }

  /**
   * Add a custom scheduled task
   */
  addTask(name: string, cronExpression: string, callback: () => Promise<void>): void {
    if (this.scheduledTasks.has(name)) {
      logger.warn(`Task ${name} already exists, stopping existing task`);
      const existingTask = this.scheduledTasks.get(name);
      existingTask?.stop();
      existingTask?.destroy();
    }

    const task = cron.schedule(cronExpression, async () => {
      try {
        await callback();
      } catch (error) {
        logger.error(`Error in scheduled task ${name}:`, error);
      }
    }, {
      scheduled: false
    });

    this.scheduledTasks.set(name, task);
    task.start();

    logger.info(`Added scheduled task: ${name} with expression: ${cronExpression}`);
  }

  /**
   * Remove a scheduled task
   */
  removeTask(name: string): boolean {
    const task = this.scheduledTasks.get(name);
    if (task) {
      task.stop();
      task.destroy();
      this.scheduledTasks.delete(name);
      logger.info(`Removed scheduled task: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Get list of active tasks
   */
  getActiveTasks(): string[] {
    return Array.from(this.scheduledTasks.keys());
  }

  /**
   * Check if a task is running
   */
  isTaskRunning(name: string): boolean {
    const task = this.scheduledTasks.get(name);
    return task ? task.running : false;
  }
}

export const schedulerService = SchedulerService.getInstance();
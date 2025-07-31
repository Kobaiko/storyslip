import { EmailNotificationService, EmailNotificationData } from './email-notification.service';
import { logger } from '../utils/monitoring';

export interface QueuedEmail extends EmailNotificationData {
  id: string;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  attempts: number;
  max_attempts: number;
  created_at: Date;
  scheduled_at?: Date;
  sent_at?: Date;
  error_message?: string;
}

export class EmailQueueService {
  private emailNotificationService: EmailNotificationService;
  private queue: QueuedEmail[] = [];
  private processing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.emailNotificationService = new EmailNotificationService();
    this.startProcessing();
  }

  async addToQueue(emailData: EmailNotificationData): Promise<string> {
    const queuedEmail: QueuedEmail = {
      id: this.generateId(),
      ...emailData,
      status: 'pending',
      attempts: 0,
      max_attempts: 3,
      created_at: new Date(),
    };

    this.queue.push(queuedEmail);
    logger.info(`Email added to queue: ${queuedEmail.id}`);
    
    return queuedEmail.id;
  }

  async scheduleEmail(emailData: EmailNotificationData, scheduledAt: Date): Promise<string> {
    const queuedEmail: QueuedEmail = {
      id: this.generateId(),
      ...emailData,
      scheduled_at: scheduledAt,
      status: 'pending',
      attempts: 0,
      max_attempts: 3,
      created_at: new Date(),
    };

    this.queue.push(queuedEmail);
    logger.info(`Email scheduled for ${scheduledAt.toISOString()}: ${queuedEmail.id}`);
    
    return queuedEmail.id;
  }

  async bulkAddToQueue(emailDataList: EmailNotificationData[]): Promise<string[]> {
    const ids: string[] = [];
    
    for (const emailData of emailDataList) {
      const id = await this.addToQueue(emailData);
      ids.push(id);
    }
    
    logger.info(`${emailDataList.length} emails added to queue`);
    return ids;
  }

  private startProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Process queue every 30 seconds
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 30000);

    // Process immediately
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    
    this.processing = true;
    
    try {
      const now = new Date();
      const emailsToProcess = this.queue.filter(email => 
        email.status === 'pending' && 
        email.attempts < email.max_attempts &&
        (!email.scheduled_at || email.scheduled_at <= now)
      );

      for (const email of emailsToProcess) {
        await this.processEmail(email);
      }

      // Clean up old processed emails (older than 24 hours)
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      this.queue = this.queue.filter(email => 
        email.status === 'pending' || email.created_at > cutoff
      );
    } catch (error) {
      logger.error('Error processing email queue:', error);
    } finally {
      this.processing = false;
    }
  }
import { ApiError } from '../utils/response';
import { logger } from '../middleware/logger';
import { brandService, BrandConfiguration } from './brand.service';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export interface InvitationEmailData {
  inviterName: string;
  websiteName: string;
  role: string;
  invitationUrl: string;
  expiresAt: string;
}

export interface PasswordResetEmailData {
  userName: string;
  resetUrl: string;
  expiresAt: string;
}

export interface WelcomeEmailData {
  userName: string;
  websiteName: string;
  dashboardUrl: string;
}

export class EmailService {
  private static instance: EmailService;
  private emailProvider: 'console' | 'sendgrid' | 'ses' | 'smtp';

  private constructor() {
    // Determine email provider based on environment
    this.emailProvider = this.getEmailProvider();
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Send invitation email
   */
  async sendInvitationEmail(
    email: string,
    data: InvitationEmailData,
    websiteId?: string
  ): Promise<void> {
    try {
      let template;
      
      if (websiteId) {
        // Use branded template if website ID is provided
        template = await this.generateBrandedInvitationTemplate(websiteId, data);
      } else {
        // Use default template
        template = this.generateInvitationTemplate(data);
      }
      
      await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      logger.info(`Invitation email sent to ${email}`);
    } catch (error) {
      logger.error(`Failed to send invitation email to ${email}:`, error);
      throw new ApiError('Failed to send invitation email', 500, 'EMAIL_SEND_ERROR', error);
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    data: PasswordResetEmailData,
    websiteId?: string
  ): Promise<void> {
    try {
      let template;
      
      if (websiteId) {
        // Use branded template if website ID is provided
        template = await this.generateBrandedPasswordResetTemplate(websiteId, data);
      } else {
        // Use default template
        template = this.generatePasswordResetTemplate(data);
      }
      
      await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      logger.info(`Password reset email sent to ${email}`);
    } catch (error) {
      logger.error(`Failed to send password reset email to ${email}:`, error);
      throw new ApiError('Failed to send password reset email', 500, 'EMAIL_SEND_ERROR', error);
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(
    email: string,
    data: WelcomeEmailData
  ): Promise<void> {
    try {
      const template = this.generateWelcomeTemplate(data);
      
      await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      logger.info(`Welcome email sent to ${email}`);
    } catch (error) {
      logger.error(`Failed to send welcome email to ${email}:`, error);
      // Don't throw error for welcome emails as they're not critical
    }
  }

  /**
   * Send generic email
   */
  private async sendEmail(options: EmailOptions): Promise<void> {
    switch (this.emailProvider) {
      case 'console':
        await this.sendConsoleEmail(options);
        break;
      case 'sendgrid':
        await this.sendSendGridEmail(options);
        break;
      case 'ses':
        await this.sendSESEmail(options);
        break;
      case 'smtp':
        await this.sendSMTPEmail(options);
        break;
      default:
        throw new Error(`Unsupported email provider: ${this.emailProvider}`);
    }
  }

  /**
   * Console email (for development)
   */
  private async sendConsoleEmail(options: EmailOptions): Promise<void> {
    console.log('📧 EMAIL WOULD BE SENT:');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('Text:', options.text);
    console.log('HTML:', options.html);
    console.log('---');
  }

  /**
   * SendGrid email implementation
   */
  private async sendSendGridEmail(options: EmailOptions): Promise<void> {
    // TODO: Implement SendGrid integration
    // This would use @sendgrid/mail package
    throw new Error('SendGrid integration not implemented yet');
  }

  /**
   * AWS SES email implementation
   */
  private async sendSESEmail(options: EmailOptions): Promise<void> {
    // TODO: Implement AWS SES integration
    // This would use AWS SDK
    throw new Error('AWS SES integration not implemented yet');
  }

  /**
   * SMTP email implementation
   */
  private async sendSMTPEmail(options: EmailOptions): Promise<void> {
    // TODO: Implement SMTP integration
    // This would use nodemailer
    throw new Error('SMTP integration not implemented yet');
  }

  /**
   * Generate invitation email template
   */
  private generateInvitationTemplate(data: InvitationEmailData): EmailTemplate {
    const subject = `You've been invited to join ${data.websiteName} on StorySlip`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation to ${data.websiteName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .button { 
            display: inline-block; 
            background: #3b82f6; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
          }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>StorySlip</h1>
          </div>
          <div class="content">
            <h2>You've been invited!</h2>
            <p>Hi there,</p>
            <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.websiteName}</strong> as a <strong>${data.role}</strong> on StorySlip.</p>
            <p>StorySlip is a powerful content management system that makes it easy to create, manage, and publish content on your website.</p>
            <p>Click the button below to accept your invitation and get started:</p>
            <p style="text-align: center;">
              <a href="${data.invitationUrl}" class="button">Accept Invitation</a>
            </p>
            <p><strong>Important:</strong> This invitation will expire on ${new Date(data.expiresAt).toLocaleDateString()}.</p>
            <p>If you can't click the button above, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${data.invitationUrl}</p>
            <p>If you have any questions, feel free to reach out to ${data.inviterName} or our support team.</p>
            <p>Welcome to StorySlip!</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} StorySlip. All rights reserved.</p>
            <p>This invitation was sent to you by ${data.inviterName}.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
You've been invited to join ${data.websiteName} on StorySlip!

${data.inviterName} has invited you to join ${data.websiteName} as a ${data.role}.

Accept your invitation: ${data.invitationUrl}

This invitation expires on ${new Date(data.expiresAt).toLocaleDateString()}.

Welcome to StorySlip!
    `.trim();

    return { subject, html, text };
  }

  /**
   * Generate password reset email template
   */
  private generatePasswordResetTemplate(data: PasswordResetEmailData): EmailTemplate {
    const subject = 'Reset your StorySlip password';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .button { 
            display: inline-block; 
            background: #3b82f6; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
          }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .warning { background: #fef3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>StorySlip</h1>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>Hi ${data.userName},</p>
            <p>We received a request to reset your password for your StorySlip account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${data.resetUrl}" class="button">Reset Password</a>
            </p>
            <div class="warning">
              <strong>Security Notice:</strong> This password reset link will expire on ${new Date(data.expiresAt).toLocaleDateString()}. If you didn't request this reset, please ignore this email.
            </div>
            <p>If you can't click the button above, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${data.resetUrl}</p>
            <p>If you have any questions or concerns, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} StorySlip. All rights reserved.</p>
            <p>This email was sent because a password reset was requested for your account.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Reset Your StorySlip Password

Hi ${data.userName},

We received a request to reset your password for your StorySlip account.

Reset your password: ${data.resetUrl}

This link expires on ${new Date(data.expiresAt).toLocaleDateString()}.

If you didn't request this reset, please ignore this email.
    `.trim();

    return { subject, html, text };
  }

  /**
   * Generate welcome email template
   */
  private generateWelcomeTemplate(data: WelcomeEmailData): EmailTemplate {
    const subject = `Welcome to ${data.websiteName} on StorySlip!`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to StorySlip</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .button { 
            display: inline-block; 
            background: #3b82f6; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 5px; 
            margin: 20px 0; 
          }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 14px; color: #666; }
          .feature { margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to StorySlip!</h1>
          </div>
          <div class="content">
            <h2>Welcome, ${data.userName}!</h2>
            <p>Congratulations! You've successfully joined <strong>${data.websiteName}</strong> on StorySlip.</p>
            <p>You now have access to a powerful content management system that will help you create, manage, and publish amazing content.</p>
            
            <h3>What you can do with StorySlip:</h3>
            <div class="feature">📝 <strong>Create Content:</strong> Write and edit articles with our rich text editor</div>
            <div class="feature">📊 <strong>Track Analytics:</strong> Monitor your content performance and audience engagement</div>
            <div class="feature">🎨 <strong>Manage Media:</strong> Upload and organize images and documents</div>
            <div class="feature">🔍 <strong>SEO Optimization:</strong> Optimize your content for search engines</div>
            <div class="feature">👥 <strong>Team Collaboration:</strong> Work together with your team members</div>
            
            <p style="text-align: center;">
              <a href="${data.dashboardUrl}" class="button">Go to Dashboard</a>
            </p>
            
            <p>If you have any questions or need help getting started, don't hesitate to reach out to your team or our support.</p>
            <p>Happy content creating!</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} StorySlip. All rights reserved.</p>
            <p>You're receiving this email because you joined ${data.websiteName}.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to StorySlip!

Hi ${data.userName},

Congratulations! You've successfully joined ${data.websiteName} on StorySlip.

What you can do with StorySlip:
- Create and edit content with our rich text editor
- Track analytics and monitor performance
- Manage media files and images
- Optimize content for SEO
- Collaborate with your team

Get started: ${data.dashboardUrl}

Welcome aboard!
    `.trim();

    return { subject, html, text };
  }

  /**
   * Generate branded invitation email template
   */
  private async generateBrandedInvitationTemplate(
    websiteId: string,
    data: InvitationEmailData
  ): Promise<EmailTemplate> {
    try {
      // Import brand service dynamically to avoid circular dependencies
      const { brandService } = await import('./brand.service');
      const brandConfig = await brandService.getBrandConfiguration(websiteId);

      return brandService.generateBrandedEmailTemplate(brandConfig, {
        subject: `You've been invited to join ${data.websiteName}`,
        heading: 'You\'ve been invited!',
        body: `
          <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.websiteName}</strong> as a <strong>${data.role}</strong>.</p>
          <p>Click the button below to accept your invitation and get started:</p>
        `,
        buttonText: 'Accept Invitation',
        buttonUrl: data.invitationUrl,
      });
    } catch (error) {
      // Fallback to default template if brand configuration fails
      return this.generateInvitationTemplate(data);
    }
  }

  /**
   * Determine email provider based on environment
   */
  private getEmailProvider(): 'console' | 'sendgrid' | 'ses' | 'smtp' {
    if (process.env.NODE_ENV === 'development') {
      return 'console';
    }

    if (process.env.SENDGRID_API_KEY) {
      return 'sendgrid';
    }

    if (process.env.AWS_SES_REGION) {
      return 'ses';
    }

    if (process.env.SMTP_HOST) {
      return 'smtp';
    }

    return 'console';
  }
}

export const emailService = EmailService.getInstance();
  /*
*
   * Send welcome email with branding
   */
  async sendWelcomeEmail(
    email: string,
    data: WelcomeEmailData,
    websiteId?: string
  ): Promise<void> {
    try {
      let template;
      
      if (websiteId) {
        template = await this.generateBrandedWelcomeTemplate(websiteId, data);
      } else {
        template = this.generateWelcomeTemplate(data);
      }
      
      await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      logger.info(`Welcome email sent to ${email}`);
    } catch (error) {
      logger.error(`Failed to send welcome email to ${email}:`, error);
      throw new ApiError('Failed to send welcome email', 500, 'EMAIL_SEND_ERROR', error);
    }
  }

  /**
   * Send content notification email with branding
   */
  async sendContentNotificationEmail(
    email: string,
    data: {
      userName: string;
      contentTitle: string;
      contentUrl: string;
      websiteName: string;
      notificationType: 'published' | 'updated' | 'scheduled';
    },
    websiteId?: string
  ): Promise<void> {
    try {
      let template;
      
      if (websiteId) {
        template = await this.generateBrandedContentNotificationTemplate(websiteId, data);
      } else {
        template = this.generateContentNotificationTemplate(data);
      }
      
      await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });

      logger.info(`Content notification email sent to ${email}`);
    } catch (error) {
      logger.error(`Failed to send content notification email to ${email}:`, error);
      throw new ApiError('Failed to send content notification email', 500, 'EMAIL_SEND_ERROR', error);
    }
  }

  /**
   * Generate branded invitation template
   */
  private async generateBrandedInvitationTemplate(
    websiteId: string,
    data: InvitationEmailData
  ): Promise<EmailTemplate> {
    try {
      const brandConfig = await brandService.getBrandConfiguration(websiteId);
      
      return brandService.generateBrandedEmailTemplate(brandConfig, {
        subject: `You're invited to join ${data.websiteName}`,
        heading: `Welcome to ${data.websiteName}!`,
        body: `
          <p>Hi there!</p>
          <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.websiteName}</strong> as a <strong>${data.role}</strong>.</p>
          <p>Click the button below to accept your invitation and get started:</p>
        `,
        buttonText: 'Accept Invitation',
        buttonUrl: data.invitationUrl,
        footerLinks: [
          { text: 'Help Center', url: `${process.env.DASHBOARD_URL}/help` },
          { text: 'Contact Support', url: `${process.env.DASHBOARD_URL}/support` },
        ],
      });
    } catch (error) {
      logger.error('Failed to generate branded invitation template:', error);
      // Fallback to default template
      return this.generateInvitationTemplate(data);
    }
  }

  /**
   * Generate branded password reset template
   */
  private async generateBrandedPasswordResetTemplate(
    websiteId: string,
    data: PasswordResetEmailData
  ): Promise<EmailTemplate> {
    try {
      const brandConfig = await brandService.getBrandConfiguration(websiteId);
      
      return brandService.generateBrandedEmailTemplate(brandConfig, {
        subject: `Reset your password for ${brandConfig.brand_name || 'StorySlip'}`,
        heading: 'Reset Your Password',
        body: `
          <p>Hi ${data.userName},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p><small>This link will expire on ${new Date(data.expiresAt).toLocaleString()}.</small></p>
          <p>If you didn't request this password reset, you can safely ignore this email.</p>
        `,
        buttonText: 'Reset Password',
        buttonUrl: data.resetUrl,
        footerLinks: [
          { text: 'Help Center', url: `${process.env.DASHBOARD_URL}/help` },
          { text: 'Contact Support', url: `${process.env.DASHBOARD_URL}/support` },
        ],
      });
    } catch (error) {
      logger.error('Failed to generate branded password reset template:', error);
      // Fallback to default template
      return this.generatePasswordResetTemplate(data);
    }
  }

  /**
   * Generate branded welcome template
   */
  private async generateBrandedWelcomeTemplate(
    websiteId: string,
    data: WelcomeEmailData
  ): Promise<EmailTemplate> {
    try {
      const brandConfig = await brandService.getBrandConfiguration(websiteId);
      
      return brandService.generateBrandedEmailTemplate(brandConfig, {
        subject: `Welcome to ${brandConfig.brand_name || data.websiteName}!`,
        heading: `Welcome, ${data.userName}!`,
        body: `
          <p>Thank you for joining <strong>${brandConfig.brand_name || data.websiteName}</strong>!</p>
          <p>You're all set up and ready to start creating amazing content. Here's what you can do next:</p>
          <ul>
            <li>Complete your profile setup</li>
            <li>Explore the dashboard features</li>
            <li>Create your first piece of content</li>
            <li>Invite team members to collaborate</li>
          </ul>
          <p>Click the button below to access your dashboard:</p>
        `,
        buttonText: 'Go to Dashboard',
        buttonUrl: data.dashboardUrl,
        footerLinks: [
          { text: 'Getting Started Guide', url: `${process.env.DASHBOARD_URL}/guide` },
          { text: 'Help Center', url: `${process.env.DASHBOARD_URL}/help` },
          { text: 'Contact Support', url: `${process.env.DASHBOARD_URL}/support` },
        ],
      });
    } catch (error) {
      logger.error('Failed to generate branded welcome template:', error);
      // Fallback to default template
      return this.generateWelcomeTemplate(data);
    }
  }

  /**
   * Generate branded content notification template
   */
  private async generateBrandedContentNotificationTemplate(
    websiteId: string,
    data: {
      userName: string;
      contentTitle: string;
      contentUrl: string;
      websiteName: string;
      notificationType: 'published' | 'updated' | 'scheduled';
    }
  ): Promise<EmailTemplate> {
    try {
      const brandConfig = await brandService.getBrandConfiguration(websiteId);
      
      const actionText = {
        published: 'published',
        updated: 'updated',
        scheduled: 'scheduled for publishing',
      }[data.notificationType];

      const subject = `Content ${actionText}: ${data.contentTitle}`;
      
      return brandService.generateBrandedEmailTemplate(brandConfig, {
        subject,
        heading: `Content ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`,
        body: `
          <p>Hi ${data.userName},</p>
          <p>Your content "<strong>${data.contentTitle}</strong>" has been <strong>${actionText}</strong> on ${brandConfig.brand_name || data.websiteName}.</p>
          <p>Click the button below to view your content:</p>
        `,
        buttonText: 'View Content',
        buttonUrl: data.contentUrl,
        footerLinks: [
          { text: 'Dashboard', url: `${process.env.DASHBOARD_URL}/websites/${websiteId}` },
          { text: 'Content Management', url: `${process.env.DASHBOARD_URL}/websites/${websiteId}/content` },
        ],
      });
    } catch (error) {
      logger.error('Failed to generate branded content notification template:', error);
      // Fallback to default template
      return this.generateContentNotificationTemplate(data);
    }
  }

  /**
   * Generate default content notification template
   */
  private generateContentNotificationTemplate(data: {
    userName: string;
    contentTitle: string;
    contentUrl: string;
    websiteName: string;
    notificationType: 'published' | 'updated' | 'scheduled';
  }): EmailTemplate {
    const actionText = {
      published: 'published',
      updated: 'updated',
      scheduled: 'scheduled for publishing',
    }[data.notificationType];

    const subject = `Content ${actionText}: ${data.contentTitle}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Content ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}</h2>
        <p>Hi ${data.userName},</p>
        <p>Your content "<strong>${data.contentTitle}</strong>" has been <strong>${actionText}</strong> on ${data.websiteName}.</p>
        <p><a href="${data.contentUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">View Content</a></p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">Powered by StorySlip</p>
      </div>
    `;

    const text = `
Content ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}

Hi ${data.userName},

Your content "${data.contentTitle}" has been ${actionText} on ${data.websiteName}.

View Content: ${data.contentUrl}

Powered by StorySlip
    `.trim();

    return { subject, html, text };
  }
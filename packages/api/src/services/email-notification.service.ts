import { EmailService } from './email.service';
import { BrandService } from './brand.service';
import { UserService } from './user.service';
import { ContentService } from './content.service';
import { logger } from '../utils/monitoring';

export interface EmailNotificationData {
  user_id?: string;
  email?: string;
  template_id: string;
  variables: Record<string, any>;
  website_id?: string;
  priority?: 'low' | 'normal' | 'high';
  scheduled_at?: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  html_template: string;
  text_template: string;
  variables: string[];
  category: 'auth' | 'content' | 'team' | 'system';
  enabled: boolean;
}

export class EmailNotificationService {
  private emailService: EmailService;
  private brandService: BrandService;
  private userService: UserService;
  private contentService: ContentService;

  constructor() {
    this.emailService = new EmailService();
    this.brandService = new BrandService();
    this.userService = new UserService();
    this.contentService = new ContentService();
  }

  async sendNotification(data: EmailNotificationData): Promise<void> {
    try {
      const template = await this.getTemplate(data.template_id);
      if (!template || !template.enabled) {
        logger.warn(`Template ${data.template_id} not found or disabled`);
        return;
      }

      // Get recipient email
      const recipientEmail = data.email || 
        (data.user_id ? await this.getUserEmail(data.user_id) : null);
      
      if (!recipientEmail) {
        throw new Error('No recipient email provided');
      }

      // Get brand configuration for styling
      const brandConfig = data.website_id ? 
        await this.brandService.getBrandConfiguration(data.website_id) : null;

      // Process template with variables and branding
      const processedEmail = await this.processTemplate(
        template, 
        data.variables, 
        brandConfig
      );

      // Send email
      await this.emailService.sendEmail({
        to: recipientEmail,
        subject: processedEmail.subject,
        html: processedEmail.html,
        text: processedEmail.text,
        from: brandConfig?.email_templates?.sender_email || 
              process.env.DEFAULT_FROM_EMAIL,
        replyTo: brandConfig?.email_templates?.reply_to_email,
      });

      logger.info(`Email notification sent: ${data.template_id} to ${recipientEmail}`);
    } catch (error) {
      logger.error('Failed to send email notification:', error);
      throw error;
    }
  }  private 
async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    // In a real app, this would query the database
    const templates: NotificationTemplate[] = [
      {
        id: 'welcome',
        name: 'Welcome Email',
        subject: 'Welcome to {{company_name}}!',
        html_template: this.getWelcomeHtmlTemplate(),
        text_template: this.getWelcomeTextTemplate(),
        variables: ['user_name', 'company_name', 'login_url'],
        category: 'auth',
        enabled: true,
      },
      {
        id: 'invitation',
        name: 'Team Invitation',
        subject: 'You\'ve been invited to join {{company_name}}',
        html_template: this.getInvitationHtmlTemplate(),
        text_template: this.getInvitationTextTemplate(),
        variables: ['inviter_name', 'company_name', 'invitation_url', 'expires_at'],
        category: 'team',
        enabled: true,
      },
      {
        id: 'password_reset',
        name: 'Password Reset',
        subject: 'Reset your password',
        html_template: this.getPasswordResetHtmlTemplate(),
        text_template: this.getPasswordResetTextTemplate(),
        variables: ['user_name', 'reset_url', 'expires_at'],
        category: 'auth',
        enabled: true,
      },
      {
        id: 'content_published',
        name: 'Content Published',
        subject: 'Your content "{{content_title}}" has been published',
        html_template: this.getContentPublishedHtmlTemplate(),
        text_template: this.getContentPublishedTextTemplate(),
        variables: ['user_name', 'content_title', 'content_url', 'published_at'],
        category: 'content',
        enabled: true,
      },
      {
        id: 'weekly_digest',
        name: 'Weekly Digest',
        subject: 'Your weekly content digest',
        html_template: this.getWeeklyDigestHtmlTemplate(),
        text_template: this.getWeeklyDigestTextTemplate(),
        variables: ['user_name', 'total_views', 'top_content', 'week_range'],
        category: 'system',
        enabled: true,
      },
    ];

    return templates.find(t => t.id === templateId) || null;
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    try {
      const user = await this.userService.getUserById(userId);
      return user?.email || null;
    } catch (error) {
      logger.error(`Failed to get user email for ${userId}:`, error);
      return null;
    }
  }

  private async processTemplate(
    template: NotificationTemplate,
    variables: Record<string, any>,
    brandConfig: any
  ): Promise<{ subject: string; html: string; text: string }> {
    // Process subject
    const subject = this.replaceVariables(template.subject, variables);

    // Process HTML template with branding
    let html = this.replaceVariables(template.html_template, variables);
    if (brandConfig) {
      html = this.applyBranding(html, brandConfig);
    }

    // Process text template
    const text = this.replaceVariables(template.text_template, variables);

    return { subject, html, text };
  }

  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value || ''));
    });

    return result;
  }  
private applyBranding(html: string, brandConfig: any): string {
    const emailConfig = brandConfig.email_templates || {};
    
    // Apply color scheme
    html = html.replace(/{{header_color}}/g, emailConfig.header_color || '#3B82F6');
    html = html.replace(/{{button_color}}/g, emailConfig.button_color || '#3B82F6');
    html = html.replace(/{{text_color}}/g, emailConfig.text_color || '#111827');
    html = html.replace(/{{background_color}}/g, emailConfig.background_color || '#FFFFFF');
    html = html.replace(/{{footer_color}}/g, emailConfig.footer_color || '#F9FAFB');

    // Apply custom header/footer
    if (emailConfig.custom_header_html) {
      html = html.replace('{{custom_header}}', emailConfig.custom_header_html);
    }
    if (emailConfig.custom_footer_html) {
      html = html.replace('{{custom_footer}}', emailConfig.custom_footer_html);
    }

    // Apply company branding
    html = html.replace(/{{company_name}}/g, brandConfig.company_name || 'StorySlip');
    html = html.replace(/{{company_logo}}/g, brandConfig.logo?.primary_logo_url || '');

    return html;
  }

  // Template methods
  private getWelcomeHtmlTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to {{company_name}}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: {{text_color}}; background-color: {{background_color}}; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background-color: {{header_color}}; color: white; padding: 30px; text-align: center; }
          .body { padding: 30px; }
          .footer { background-color: {{footer_color}}; padding: 20px; text-align: center; font-size: 14px; color: #6B7280; }
          .button { display: inline-block; background-color: {{button_color}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            {{custom_header}}
            <h1>Welcome to {{company_name}}!</h1>
          </div>
          <div class="body">
            <h2>Hi {{user_name}},</h2>
            <p>Welcome to {{company_name}}! We're excited to have you on board.</p>
            <p>Here are some things you can do to get started:</p>
            <ul>
              <li>Complete your profile</li>
              <li>Explore our features</li>
              <li>Connect with your team</li>
            </ul>
            <a href="{{login_url}}" class="button">Get Started</a>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br>The {{company_name}} Team</p>
          </div>
          <div class="footer">
            {{custom_footer}}
            <p>© 2024 {{company_name}}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getWelcomeTextTemplate(): string {
    return `
Welcome to {{company_name}}!

Hi {{user_name}},

Welcome to {{company_name}}! We're excited to have you on board.

Here are some things you can do to get started:
- Complete your profile
- Explore our features  
- Connect with your team

Get started: {{login_url}}

If you have any questions, feel free to reach out to our support team.

Best regards,
The {{company_name}} Team
    `;
  }  private
 getInvitationHtmlTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You're Invited!</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: {{text_color}}; background-color: {{background_color}}; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background-color: {{header_color}}; color: white; padding: 30px; text-align: center; }
          .body { padding: 30px; }
          .footer { background-color: {{footer_color}}; padding: 20px; text-align: center; font-size: 14px; color: #6B7280; }
          .button { display: inline-block; background-color: {{button_color}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            {{custom_header}}
            <h1>You're Invited!</h1>
          </div>
          <div class="body">
            <h2>Hi there,</h2>
            <p>You've been invited to join {{company_name}} by {{inviter_name}}.</p>
            <p>Click the button below to accept the invitation and create your account:</p>
            <a href="{{invitation_url}}" class="button">Accept Invitation</a>
            <p>This invitation will expire on {{expires_at}}.</p>
            <p>Best regards,<br>The {{company_name}} Team</p>
          </div>
          <div class="footer">
            {{custom_footer}}
            <p>© 2024 {{company_name}}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getInvitationTextTemplate(): string {
    return `
You're Invited to {{company_name}}!

Hi there,

You've been invited to join {{company_name}} by {{inviter_name}}.

Accept your invitation: {{invitation_url}}

This invitation will expire on {{expires_at}}.

Best regards,
The {{company_name}} Team
    `;
  }

  private getPasswordResetHtmlTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: {{text_color}}; background-color: {{background_color}}; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background-color: {{header_color}}; color: white; padding: 30px; text-align: center; }
          .body { padding: 30px; }
          .footer { background-color: {{footer_color}}; padding: 20px; text-align: center; font-size: 14px; color: #6B7280; }
          .button { display: inline-block; background-color: {{button_color}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            {{custom_header}}
            <h1>Reset Your Password</h1>
          </div>
          <div class="body">
            <h2>Hi {{user_name}},</h2>
            <p>We received a request to reset your password for your {{company_name}} account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="{{reset_url}}" class="button">Reset Password</a>
            <p>If you didn't request this password reset, you can safely ignore this email.</p>
            <p>This link will expire on {{expires_at}} for security reasons.</p>
            <p>Best regards,<br>The {{company_name}} Team</p>
          </div>
          <div class="footer">
            {{custom_footer}}
            <p>© 2024 {{company_name}}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }  private 
getPasswordResetTextTemplate(): string {
    return `
Reset Your Password

Hi {{user_name}},

We received a request to reset your password for your {{company_name}} account.

Reset your password: {{reset_url}}

If you didn't request this password reset, you can safely ignore this email.

This link will expire on {{expires_at}} for security reasons.

Best regards,
The {{company_name}} Team
    `;
  }

  private getContentPublishedHtmlTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Content Published</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: {{text_color}}; background-color: {{background_color}}; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background-color: {{header_color}}; color: white; padding: 30px; text-align: center; }
          .body { padding: 30px; }
          .footer { background-color: {{footer_color}}; padding: 20px; text-align: center; font-size: 14px; color: #6B7280; }
          .button { display: inline-block; background-color: {{button_color}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            {{custom_header}}
            <h1>Content Published!</h1>
          </div>
          <div class="body">
            <h2>Hi {{user_name}},</h2>
            <p>Great news! Your content "{{content_title}}" has been published on {{published_at}}.</p>
            <p>Your content is now live and available to your audience.</p>
            <a href="{{content_url}}" class="button">View Content</a>
            <p>Keep up the great work!</p>
            <p>Best regards,<br>The {{company_name}} Team</p>
          </div>
          <div class="footer">
            {{custom_footer}}
            <p>© 2024 {{company_name}}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getContentPublishedTextTemplate(): string {
    return `
Content Published!

Hi {{user_name}},

Great news! Your content "{{content_title}}" has been published on {{published_at}}.

Your content is now live and available to your audience.

View your content: {{content_url}}

Keep up the great work!

Best regards,
The {{company_name}} Team
    `;
  }

  private getWeeklyDigestHtmlTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Weekly Digest</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: {{text_color}}; background-color: {{background_color}}; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
          .header { background-color: {{header_color}}; color: white; padding: 30px; text-align: center; }
          .body { padding: 30px; }
          .footer { background-color: {{footer_color}}; padding: 20px; text-align: center; font-size: 14px; color: #6B7280; }
          .button { display: inline-block; background-color: {{button_color}}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
          .stats { background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            {{custom_header}}
            <h1>Your Weekly Digest</h1>
            <p>{{week_range}}</p>
          </div>
          <div class="body">
            <h2>Hi {{user_name}},</h2>
            <p>Here's a summary of your content performance this week:</p>
            
            <div class="stats">
              <h3>📊 This Week's Stats</h3>
              <p><strong>Total Views:</strong> {{total_views}}</p>
              <p><strong>Top Content:</strong> {{top_content}}</p>
            </div>
            
            <p>Keep creating amazing content!</p>
            <a href="{{dashboard_url}}" class="button">View Dashboard</a>
            <p>Best regards,<br>The {{company_name}} Team</p>
          </div>
          <div class="footer">
            {{custom_footer}}
            <p>© 2024 {{company_name}}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getWeeklyDigestTextTemplate(): string {
    return `
Your Weekly Digest - {{week_range}}

Hi {{user_name}},

Here's a summary of your content performance this week:

📊 This Week's Stats
Total Views: {{total_views}}
Top Content: {{top_content}}

Keep creating amazing content!

View your dashboard: {{dashboard_url}}

Best regards,
The {{company_name}} Team
    `;
  }

  // Convenience methods for common notifications
  async sendWelcomeEmail(userId: string, websiteId?: string): Promise<void> {
    const user = await this.userService.getUserById(userId);
    if (!user) throw new Error('User not found');

    await this.sendNotification({
      user_id: userId,
      template_id: 'welcome',
      website_id: websiteId,
      variables: {
        user_name: user.name,
        login_url: process.env.FRONTEND_URL + '/login',
      },
    });
  }

  async sendInvitationEmail(
    email: string, 
    inviterName: string, 
    invitationUrl: string,
    expiresAt: Date,
    websiteId?: string
  ): Promise<void> {
    await this.sendNotification({
      email,
      template_id: 'invitation',
      website_id: websiteId,
      variables: {
        inviter_name: inviterName,
        invitation_url: invitationUrl,
        expires_at: expiresAt.toLocaleDateString(),
      },
    });
  }

  async sendPasswordResetEmail(
    userId: string, 
    resetUrl: string, 
    expiresAt: Date,
    websiteId?: string
  ): Promise<void> {
    await this.sendNotification({
      user_id: userId,
      template_id: 'password_reset',
      website_id: websiteId,
      variables: {
        reset_url: resetUrl,
        expires_at: expiresAt.toLocaleDateString(),
      },
    });
  }

  async sendContentPublishedEmail(
    userId: string, 
    contentTitle: string, 
    contentUrl: string,
    publishedAt: Date,
    websiteId?: string
  ): Promise<void> {
    await this.sendNotification({
      user_id: userId,
      template_id: 'content_published',
      website_id: websiteId,
      variables: {
        content_title: contentTitle,
        content_url: contentUrl,
        published_at: publishedAt.toLocaleDateString(),
      },
    });
  }

  async sendWeeklyDigestEmail(
    userId: string,
    totalViews: number,
    topContent: string,
    weekRange: string,
    websiteId?: string
  ): Promise<void> {
    await this.sendNotification({
      user_id: userId,
      template_id: 'weekly_digest',
      website_id: websiteId,
      variables: {
        total_views: totalViews.toLocaleString(),
        top_content: topContent,
        week_range: weekRange,
        dashboard_url: process.env.FRONTEND_URL + '/analytics',
      },
    });
  }
}
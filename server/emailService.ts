import nodemailer from 'nodemailer';
import handlebars from 'handlebars';
import { User, Task, Room, Inspection } from '../shared/schema';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface EmailTemplateData {
  user: User;
  hotelName?: string;
  [key: string]: any;
}

export class EmailService {
  private transporter: nodemailer.Transporter;
  private config: EmailConfig;

  constructor() {
    this.config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      },
      from: process.env.SMTP_FROM || 'noreply@hotel.com'
    };

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth
    });
  }

  private async renderTemplate(templateName: string, data: EmailTemplateData): Promise<{ subject: string; html: string }> {
    const templates = {
      taskAssigned: {
        subject: 'New Task Assigned - {{task.title}}',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Task Assigned</h2>
            <p>Hello {{user.name}},</p>
            <p>You have been assigned a new task:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #555;">{{task.title}}</h3>
              <p style="margin: 0 0 10px 0;"><strong>Description:</strong> {{task.description}}</p>
              <p style="margin: 0 0 10px 0;"><strong>Priority:</strong> {{task.priority}}</p>
              <p style="margin: 0 0 10px 0;"><strong>Due Date:</strong> {{task.dueAt}}</p>
              {{#if task.roomNumber}}
              <p style="margin: 0;"><strong>Room:</strong> {{task.roomNumber}}</p>
              {{/if}}
            </div>
            <p>Please log into the hotel management system to view details and update your progress.</p>
            <p>Best regards,<br>{{hotelName}} Management</p>
          </div>
        `
      },
      taskCompleted: {
        subject: 'Task Completed - {{task.title}}',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">Task Completed</h2>
            <p>Hello {{user.name}},</p>
            <p>The following task has been completed:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #555;">{{task.title}}</h3>
              <p style="margin: 0 0 10px 0;"><strong>Completed by:</strong> {{completedBy}}</p>
              <p style="margin: 0 0 10px 0;"><strong>Completion Time:</strong> {{task.completedAt}}</p>
              {{#if task.roomNumber}}
              <p style="margin: 0;"><strong>Room:</strong> {{task.roomNumber}}</p>
              {{/if}}
            </div>
            <p>Best regards,<br>{{hotelName}} Management</p>
          </div>
        `
      },
      roomStatusChanged: {
        subject: 'Room Status Update - Room {{room.number}}',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Room Status Update</h2>
            <p>Hello {{user.name}},</p>
            <p>Room status has been updated:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #555;">Room {{room.number}} - {{room.type}}</h3>
              <p style="margin: 0 0 10px 0;"><strong>New Status:</strong> {{room.status}}</p>
              <p style="margin: 0 0 10px 0;"><strong>Previous Status:</strong> {{previousStatus}}</p>
              <p style="margin: 0;"><strong>Updated by:</strong> {{updatedBy}}</p>
            </div>
            <p>Best regards,<br>{{hotelName}} Management</p>
          </div>
        `
      },
      inspectionCompleted: {
        subject: 'Inspection Completed - {{inspection.kind}} Inspection',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Inspection Completed</h2>
            <p>Hello {{user.name}},</p>
            <p>An inspection has been completed:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #555;">{{inspection.kind}} Inspection</h3>
              {{#if inspection.roomNumber}}
              <p style="margin: 0 0 10px 0;"><strong>Room:</strong> {{inspection.roomNumber}}</p>
              {{/if}}
              <p style="margin: 0 0 10px 0;"><strong>Score:</strong> {{inspection.score}}%</p>
              <p style="margin: 0 0 10px 0;"><strong>Status:</strong> {{#if inspection.passFail}}PASSED{{else}}FAILED{{/if}}</p>
              <p style="margin: 0;"><strong>Inspector:</strong> {{inspector}}</p>
            </div>
            <p>Best regards,<br>{{hotelName}} Management</p>
          </div>
        `
      },
      panicAlert: {
        subject: 'URGENT: Panic Alert Activated',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545; border: 2px solid #dc3545; padding: 15px; text-align: center;">URGENT: PANIC ALERT</h2>
            <p>Hello {{user.name}},</p>
            <p style="color: #dc3545; font-weight: bold;">A panic alert has been activated in the hotel.</p>
            <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #f5c6cb;">
              <p style="margin: 0 0 10px 0;"><strong>Alert Time:</strong> {{alertTime}}</p>
              <p style="margin: 0 0 10px 0;"><strong>Location:</strong> {{location}}</p>
              <p style="margin: 0;"><strong>Triggered by:</strong> {{triggeredBy}}</p>
            </div>
            <p style="color: #dc3545; font-weight: bold;">Please respond immediately according to emergency protocols.</p>
            <p>Best regards,<br>{{hotelName}} Management</p>
          </div>
        `
      }
    };

    const template = templates[templateName as keyof typeof templates];
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    const subjectTemplate = handlebars.compile(template.subject);
    const htmlTemplate = handlebars.compile(template.html);

    return {
      subject: subjectTemplate(data),
      html: htmlTemplate(data)
    };
  }

  async sendEmail(to: string | string[], templateName: string, data: EmailTemplateData): Promise<void> {
    try {
      const { subject, html } = await this.renderTemplate(templateName, {
        ...data,
        hotelName: process.env.HOTEL_NAME || 'Hotel Management System'
      });

      const recipients = Array.isArray(to) ? to : [to];

      await this.transporter.sendMail({
        from: this.config.from,
        to: recipients.join(', '),
        subject,
        html
      });

      console.log(`Email sent successfully to: ${recipients.join(', ')}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendTaskAssignedNotification(task: Task, assignee: User, room?: Room): Promise<void> {
    if (!assignee.email || !this.shouldSendNotification(assignee, 'taskAssigned')) {
      return;
    }

    await this.sendEmail(assignee.email, 'taskAssigned', {
      user: assignee,
      task: {
        ...task,
        roomNumber: room?.number,
        dueAt: task.dueAt ? new Date(task.dueAt).toLocaleDateString() : 'Not specified'
      }
    });
  }

  async sendTaskCompletedNotification(task: Task, completedBy: User, supervisors: User[], room?: Room): Promise<void> {
    const recipients = supervisors
      .filter(user => user.email && this.shouldSendNotification(user, 'taskCompleted'))
      .map(user => user.email!);

    if (recipients.length === 0) return;

    for (const supervisor of supervisors) {
      if (supervisor.email && this.shouldSendNotification(supervisor, 'taskCompleted')) {
        await this.sendEmail(supervisor.email, 'taskCompleted', {
          user: supervisor,
          task: {
            ...task,
            roomNumber: room?.number,
            completedAt: task.finishedAt ? new Date(task.finishedAt).toLocaleString() : 'Unknown'
          },
          completedBy: completedBy.name
        });
      }
    }
  }

  async sendRoomStatusNotification(room: Room, previousStatus: string, updatedBy: User, recipients: User[]): Promise<void> {
    for (const recipient of recipients) {
      if (recipient.email && this.shouldSendNotification(recipient, 'roomStatusChanged')) {
        await this.sendEmail(recipient.email, 'roomStatusChanged', {
          user: recipient,
          room,
          previousStatus,
          updatedBy: updatedBy.name
        });
      }
    }
  }

  async sendInspectionCompletedNotification(inspection: Inspection, inspector: User, recipients: User[], room?: Room): Promise<void> {
    for (const recipient of recipients) {
      if (recipient.email && this.shouldSendNotification(recipient, 'inspectionCompleted')) {
        await this.sendEmail(recipient.email, 'inspectionCompleted', {
          user: recipient,
          inspection: {
            ...inspection,
            roomNumber: room?.number
          },
          inspector: inspector.name
        });
      }
    }
  }

  async sendPanicAlertNotification(triggeredBy: User, location: string, recipients: User[]): Promise<void> {
    for (const recipient of recipients) {
      if (recipient.email && recipient.canReceivePanicAlerts) {
        await this.sendEmail(recipient.email, 'panicAlert', {
          user: recipient,
          alertTime: new Date().toLocaleString(),
          location,
          triggeredBy: triggeredBy.name
        });
      }
    }
  }

  private shouldSendNotification(user: User, notificationType: string): boolean {
    if (!user.emailNotifications) return false;
    
    switch (notificationType) {
      case 'taskAssigned':
        return user.emailTaskAssigned ?? true;
      case 'taskCompleted':
        return user.emailTaskCompleted ?? true;
      case 'roomStatusChanged':
        return user.emailRoomStatusChanged ?? true;
      case 'inspectionCompleted':
        return user.emailInspectionCompleted ?? true;
      default:
        return true;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('SMTP connection test failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
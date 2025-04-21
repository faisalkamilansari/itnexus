import nodemailer from 'nodemailer';
import { User, Tenant } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

// Email account interface
export interface EmailAccount {
  id: string;
  name: string;
  host: string;
  port: string | number;
  user: string;
  password: string;
  from: string;
  secure: boolean;
  isDefault: boolean;
}

// Email configuration interface
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

// Notification type interface
export type NotificationType = 'incident' | 'service_request' | 'change_request' | 'monitoring' | 'system';

// Notification mapping interface
export interface NotificationMapping {
  type: NotificationType;
  emailAccountId: string;
}

// Store email accounts and mappings in memory until we save to database
let emailAccounts: EmailAccount[] = [];
let notificationMappings: NotificationMapping[] = [];

// Default email configuration
const defaultConfig: EmailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASSWORD || '',
  },
  from: process.env.EMAIL_FROM || 'noreply@buopsoit.com'
};

// Set email accounts
export function setEmailAccounts(accounts: EmailAccount[]): void {
  emailAccounts = accounts;
  console.log(`Set ${accounts.length} email accounts`);
}

// Set notification mappings
export function setNotificationMappings(mappings: NotificationMapping[]): void {
  notificationMappings = mappings;
  console.log(`Set ${mappings.length} notification mappings`);
}

// Get all email accounts
export function getEmailAccounts(): EmailAccount[] {
  return emailAccounts;
}

// Get all notification mappings
export function getNotificationMappings(): NotificationMapping[] {
  return notificationMappings;
}

// Get email account for notification type
export function getEmailAccountForNotificationType(type: NotificationType): EmailAccount | null {
  // If we have mappings, try to find one for this type
  if (notificationMappings.length > 0) {
    const mapping = notificationMappings.find(m => m.type === type);
    if (mapping && mapping.emailAccountId) {
      const account = emailAccounts.find(a => a.id === mapping.emailAccountId);
      if (account) return account;
    }
  }
  
  // If no mapping found or no account found for the mapping,
  // try to use the default account
  if (emailAccounts.length > 0) {
    // First, try to find an account marked as default
    const defaultAccount = emailAccounts.find(a => a.isDefault);
    if (defaultAccount) return defaultAccount;
    
    // If no default account found, use the first account
    return emailAccounts[0];
  }
  
  // If no accounts available, return null
  return null;
}

// Convert EmailAccount to EmailConfig
function emailAccountToConfig(account: EmailAccount): EmailConfig {
  return {
    host: account.host,
    port: typeof account.port === 'string' ? parseInt(account.port, 10) : account.port,
    secure: account.secure,
    auth: {
      user: account.user,
      pass: account.password,
    },
    from: account.from
  };
}

// Use tenant-specific configuration if available, otherwise use default
async function getEmailConfig(tenantId: number, notificationType?: NotificationType): Promise<EmailConfig> {
  try {
    // If we have notification type and email accounts, try to get account for that type
    if (notificationType && emailAccounts.length > 0) {
      const account = getEmailAccountForNotificationType(notificationType);
      if (account) {
        return emailAccountToConfig(account);
      }
    }
    
    // In the future, we can store tenant-specific SMTP settings in the tenant settings
    // For now, return the default config
    return defaultConfig;
  } catch (error) {
    console.error('Failed to get email configuration:', error);
    return defaultConfig;
  }
}

// Create transporter based on config
async function createTransporter(config: EmailConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.auth.user,
      pass: config.auth.pass,
    },
  });
}

// Send a notification email
export async function sendNotificationEmail({
  to,
  subject,
  html,
  tenantId,
  from,
  notificationType
}: {
  to: string;
  subject: string;
  html: string;
  tenantId: number;
  from?: string;
  notificationType?: NotificationType;
}): Promise<boolean> {
  try {
    // Get configuration based on notification type if provided
    const config = await getEmailConfig(tenantId, notificationType);
    const transporter = await createTransporter(config);
    
    const result = await transporter.sendMail({
      from: from || config.from,
      to,
      subject,
      html,
    });
    
    console.log('Email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Get user email by ID
export async function getUserEmail(userId: number): Promise<string | null> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(db.schema.users.id, userId),
    });
    
    return user?.email || null;
  } catch (error) {
    console.error('Failed to get user email:', error);
    return null;
  }
}

// Get admin users for a tenant
export async function getAdminUsers(tenantId: number): Promise<User[]> {
  try {
    return await db.query.users.findMany({
      where: (users) => 
        eq(users.tenantId, tenantId) && 
        eq(users.role, 'admin'),
    });
  } catch (error) {
    console.error('Failed to get admin users:', error);
    return [];
  }
}

// Get all support staff users for a tenant (admins, agents, etc.)
export async function getSupportUsers(tenantId: number): Promise<User[]> {
  try {
    return await db.query.users.findMany({
      where: (users) => 
        eq(users.tenantId, tenantId) && 
        (eq(users.role, 'admin') || eq(users.role, 'agent')),
    });
  } catch (error) {
    console.error('Failed to get support users:', error);
    return [];
  }
}

// Get tenant name
export async function getTenantName(tenantId: number): Promise<string> {
  try {
    const tenant = await db.query.tenants.findFirst({
      where: eq(db.schema.tenants.id, tenantId),
    });
    
    return tenant?.name || 'BuopsoIT';
  } catch (error) {
    console.error('Failed to get tenant name:', error);
    return 'BuopsoIT';
  }
}

// Generate notification for a new ticket/request
export async function generateTicketNotification({
  ticketType,
  ticketId,
  title,
  description,
  status,
  priority,
  createdByUser,
  assignedToUser,
  tenantId,
  tenant,
}: {
  ticketType: 'incident' | 'service_request' | 'change_request';
  ticketId: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdByUser?: User | null;
  assignedToUser?: User | null;
  tenantId: number;
  tenant?: Tenant | null;
}): Promise<string> {
  const ticketTypeMap = {
    incident: 'Incident',
    service_request: 'Service Request',
    change_request: 'Change Request',
  };
  
  const ticketLabel = ticketTypeMap[ticketType];
  const ticketPrefix = ticketType === 'incident' ? 'INC' : 
                         ticketType === 'service_request' ? 'SRQ' : 'CHG';
  
  const tenantName = tenant?.name || await getTenantName(tenantId);
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">${tenantName} - New ${ticketLabel}</h1>
      </div>
      
      <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1f2937; margin-top: 0;">${title}</h2>
        
        <div style="margin-bottom: 20px;">
          <p style="margin: 5px 0;"><strong>ID:</strong> #${ticketPrefix}-${ticketId}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> ${status}</p>
          <p style="margin: 5px 0;"><strong>Priority:</strong> ${priority}</p>
          <p style="margin: 5px 0;"><strong>Created By:</strong> ${createdByUser ? `${createdByUser.firstName || ''} ${createdByUser.lastName || ''} (${createdByUser.email})` : 'System'}</p>
          ${assignedToUser ? `<p style="margin: 5px 0;"><strong>Assigned To:</strong> ${assignedToUser.firstName || ''} ${assignedToUser.lastName || ''} (${assignedToUser.email})</p>` : ''}
        </div>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #4b5563;">Description:</h3>
          <p style="margin-bottom: 0;">${description}</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="#" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View ${ticketLabel}</a>
        </div>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
        <p style="margin: 0;">This is an automated message from your IT Service Management System.</p>
        <p style="margin: 5px 0;">Please do not reply directly to this email.</p>
      </div>
    </div>
  `;
}
import { MailService } from '@sendgrid/mail';

// Initialize the mail service instance
const mailService = new MailService();

// Interface for email parameters
export interface EmailParams {
  to: string | string[];
  from: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: any[];
}

/**
 * Initializes the SendGrid mail service with the provided API key
 * @param apiKey - SendGrid API key
 */
export function initializeMailService(apiKey: string): void {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error("SendGrid API key is required");
  }
  mailService.setApiKey(apiKey);
}

/**
 * Sends an email using SendGrid
 * @param params - Email parameters including to, from, subject, text/html content
 * @returns Promise resolving to boolean indicating success
 */
export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    if (!params.to || !params.from || !params.subject || (!params.text && !params.html)) {
      throw new Error("Missing required email parameters");
    }
    
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
      attachments: params.attachments,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

/**
 * Sends an alert notification via email
 * @param recipients - Email addresses to send alert to
 * @param alertSubject - Subject of the alert email
 * @param alertMessage - Content of the alert message
 * @param fromEmail - Email address to send from
 * @returns Promise resolving to boolean indicating success
 */
export async function sendAlertEmail(
  recipients: string | string[],
  alertSubject: string,
  alertMessage: string,
  fromEmail: string
): Promise<boolean> {
  try {
    const formattedHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f44336; color: white; padding: 15px; text-align: center;">
          <h1 style="margin: 0;">IT Service Alert</h1>
        </div>
        <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
          <h2 style="color: #333;">${alertSubject}</h2>
          <div style="margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #f44336;">
            ${alertMessage}
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated alert from your BuopsoIT monitoring system. 
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    return await sendEmail({
      to: recipients,
      from: fromEmail,
      subject: `[ALERT] ${alertSubject}`,
      html: formattedHtml,
      text: `IT Service Alert: ${alertSubject}\n\n${alertMessage}\n\nThis is an automated alert from your BuopsoIT monitoring system.`
    });
  } catch (error) {
    console.error('Error sending alert email:', error);
    return false;
  }
}

/**
 * Validates SendGrid configuration by sending a test email
 * @param config - Configuration object with API key, test recipient and sender
 * @returns Promise resolving to boolean indicating success
 */
export async function validateSendGridConfig(config: {
  apiKey: string;
  testRecipient: string;
  sender: string;
}): Promise<boolean> {
  try {
    // Initialize with test apiKey
    initializeMailService(config.apiKey);
    
    // Send test email
    const result = await sendEmail({
      to: config.testRecipient,
      from: config.sender,
      subject: "BuopsoIT Email Notification Test",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Notification System Test</h2>
          <p>This is a test email from your BuopsoIT monitoring system.</p>
          <p>If you are receiving this message, your email notification system is configured correctly.</p>
          <p style="color: #888; font-size: 12px; margin-top: 30px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `,
    });
    
    return result;
  } catch (error) {
    console.error('Error validating SendGrid configuration:', error);
    return false;
  }
}
import { Express, Request, Response } from 'express';
import { initializeMailService, validateSendGridConfig } from './sendgrid';
import { initializeSlackClient, validateSlackConfig } from './slack';
import { z } from 'zod';

// Schema for SendGrid configuration
const sendGridConfigSchema = z.object({
  enabled: z.boolean(),
  apiKey: z.string().min(1, "API key is required"),
  fromEmail: z.string().email("Valid sender email is required"),
  notificationEmails: z.string().min(1, "At least one notification email is required"),
  alertLevels: z.array(z.enum(["info", "warning", "error", "critical"])).default(["error", "critical"]),
});

// Schema for Slack configuration
const slackConfigSchema = z.object({
  enabled: z.boolean(),
  botToken: z.string().min(1, "Slack Bot Token is required"),
  channelId: z.string().min(1, "Channel ID is required"),
  alertLevels: z.array(z.enum(["info", "warning", "error", "critical"])).default(["error", "critical"]),
});

// Schema for notification configuration
const notificationConfigSchema = z.object({
  sendGrid: sendGridConfigSchema,
  slack: slackConfigSchema,
});

// Type for notification configuration
export type NotificationConfig = z.infer<typeof notificationConfigSchema>;

/**
 * Registers notification-related API routes
 * @param app Express application
 */
export function registerNotificationRoutes(app: Express) {
  // Save notification configuration
  app.post('/api/notifications/config', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: Admin access required'
        });
      }

      // Validate the request body against the schema
      const validationResult = notificationConfigSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid configuration data',
          errors: validationResult.error.format()
        });
      }

      const config = validationResult.data;
      
      // Here you would persist the configuration to your database
      // For now, we'll just return success
      
      return res.status(200).json({
        success: true,
        message: 'Notification configuration saved successfully',
        config
      });
    } catch (error) {
      console.error('Error saving notification configuration:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message
      });
    }
  });

  // Test SendGrid configuration
  app.post('/api/notifications/test-email', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: Admin access required'
        });
      }

      const { apiKey, testEmail, fromEmail } = req.body;
      
      if (!apiKey || !testEmail || !fromEmail) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters',
        });
      }

      const testResult = await validateSendGridConfig({
        apiKey,
        testRecipient: testEmail,
        sender: fromEmail
      });

      return res.status(200).json({
        success: testResult,
        message: testResult 
          ? 'Test email sent successfully' 
          : 'Failed to send test email'
      });
    } catch (error) {
      console.error('Error testing email configuration:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message
      });
    }
  });

  // Test Slack configuration
  app.post('/api/notifications/test-slack', async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || req.user?.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: Admin access required'
        });
      }

      const { botToken, channelId } = req.body;
      
      if (!botToken || !channelId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters',
        });
      }

      const testResult = await validateSlackConfig({
        token: botToken,
        channelId
      });

      return res.status(200).json({
        success: testResult,
        message: testResult 
          ? 'Test message sent to Slack successfully' 
          : 'Failed to send test message to Slack'
      });
    } catch (error) {
      console.error('Error testing Slack configuration:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: (error as Error).message
      });
    }
  });
}
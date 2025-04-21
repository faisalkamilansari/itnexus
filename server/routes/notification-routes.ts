import { Router } from 'express';
import { isSlackConfigured, sendSlackMessage } from '../services/slack-service';
import { WebClient } from '@slack/web-api';

const router = Router();

// Helper function to ensure the user is authenticated
const ensureAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
};

// Helper function to ensure the user is an admin
const ensureAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role === 'admin') {
    return next();
  }
  res.status(403).json({ message: "Access denied - Admin privileges required" });
};

/**
 * Get notification settings and configuration status
 */
router.get('/api/notifications/settings', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    // Slack configuration check
    const slackConfigured = isSlackConfigured();
    
    // Email configuration is always available through nodemailer
    const emailConfigured = true;
    
    res.json({
      slack: {
        configured: slackConfigured,
        // Don't expose actual tokens, just configuration status
        botTokenConfigured: !!process.env.SLACK_BOT_TOKEN,
        channelIdConfigured: !!process.env.SLACK_CHANNEL_ID
      },
      email: {
        configured: emailConfigured
      }
    });
  } catch (err) {
    console.error('Error fetching notification settings:', err);
    res.status(500).json({ message: 'Failed to fetch notification settings', error: (err as Error).message });
  }
});

/**
 * Test notification delivery
 */
router.post('/api/notifications/test', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { type, channel } = req.body;
    
    if (!type || !channel) {
      return res.status(400).json({ message: 'Missing required parameters: type and channel' });
    }
    
    // Get tenantId from user
    // @ts-ignore - Accessing tenantId from user
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID not found in user data' });
    }
    
    if (channel === 'slack') {
      // Test Slack notification
      if (!isSlackConfigured()) {
        return res.status(400).json({ 
          message: 'Slack is not configured. Please set SLACK_BOT_TOKEN and SLACK_CHANNEL_ID environment variables.',
          configured: false 
        });
      }
      
      const { sendTicketNotificationToSlack } = await import('../services/slack-service');
      const { getTenantName } = await import('../services/email-service');
      const tenantName = await getTenantName(tenantId);
      
      const result = await sendTicketNotificationToSlack({
        ticketType: type === 'incident' ? 'incident' : type === 'service_request' ? 'service_request' : 'change_request',
        ticketId: 0, // Test notification
        title: `Test ${type} notification`,
        description: 'This is a test notification to verify Slack integration is working correctly.',
        status: 'new',
        priority: 'medium',
        createdByUsername: req.user?.username || 'Test User',
        assignedToUsername: 'Unassigned',
        tenantName
      });
      
      if (result) {
        return res.json({ success: true, message: 'Test Slack notification sent successfully' });
      } else {
        return res.status(500).json({ success: false, message: 'Failed to send test Slack notification' });
      }
    } else if (channel === 'email') {
      // Test email notification
      const { sendNotificationEmail, generateTicketNotification } = await import('../services/email-service');
      
      // Use the admin's email for the test
      const adminEmail = req.user?.email;
      
      if (!adminEmail) {
        return res.status(400).json({ message: 'Admin email not found' });
      }
      
      // Check if custom email config is provided
      const customConfig = req.body.config;
      let useCustomConfig = false;
      
      // If custom email configuration is provided, use it for this test
      if (customConfig && customConfig.emailHost && customConfig.emailPort && 
          customConfig.emailUser && customConfig.emailPassword && customConfig.emailFrom) {
        
        // Temporarily store current env vars
        const originalHost = process.env.EMAIL_HOST;
        const originalPort = process.env.EMAIL_PORT;
        const originalUser = process.env.EMAIL_USER;
        const originalPassword = process.env.EMAIL_PASSWORD;
        const originalFrom = process.env.EMAIL_FROM;
        const originalSecure = process.env.EMAIL_SECURE;
        
        // Set temp env vars for this test
        process.env.EMAIL_HOST = customConfig.emailHost;
        process.env.EMAIL_PORT = customConfig.emailPort;
        process.env.EMAIL_USER = customConfig.emailUser;
        process.env.EMAIL_PASSWORD = customConfig.emailPassword;
        process.env.EMAIL_FROM = customConfig.emailFrom;
        process.env.EMAIL_SECURE = customConfig.emailSecure ? 'true' : 'false';
        
        useCustomConfig = true;
        
        console.log('Using custom email configuration for this test');
      }
      
      try {
        // Determine notification type based on the requested type
        const notificationType = type === 'incident' ? 'incident' : 
                                type === 'service_request' ? 'service_request' : 
                                type === 'change_request' ? 'change_request' : 
                                type === 'monitoring' ? 'monitoring' : 'system';
        
        // Generate test notification HTML
        const notificationHtml = await generateTicketNotification({
          ticketType: notificationType as 'incident' | 'service_request' | 'change_request',
          ticketId: 0,
          title: `Test ${type} notification`,
          description: 'This is a test notification to verify email delivery is working correctly.',
          status: 'new',
          priority: 'medium',
          createdByUser: req.user,
          assignedToUser: null,
          tenantId
        });
        
        // If this is a custom email account test, create a temporary email account
        if (useCustomConfig && customConfig) {
          // Import email service
          const { setEmailAccounts } = await import('../services/email-service');
          
          // Create a temporary account just for this test
          setEmailAccounts([{
            id: `test-email-${Date.now()}`,
            name: 'Test Email Account',
            host: customConfig.emailHost,
            port: customConfig.emailPort,
            user: customConfig.emailUser,
            password: customConfig.emailPassword,
            from: customConfig.emailFrom,
            secure: customConfig.emailSecure,
            isDefault: true
          }]);
        }
        
        const success = await sendNotificationEmail({
          to: adminEmail,
          subject: `[BuopsoIT] Test ${type} notification`,
          html: notificationHtml,
          tenantId,
          notificationType
        });
        
        if (success) {
          return res.json({ success: true, message: `Test email notification sent to ${adminEmail}` });
        } else {
          return res.status(500).json({ success: false, message: 'Failed to send test email notification' });
        }
      } catch (error) {
        return res.status(500).json({ 
          success: false, 
          message: `Failed to send test email notification: ${(error as Error).message}` 
        });
      }
    } else {
      return res.status(400).json({ message: `Unsupported notification channel: ${channel}` });
    }
  } catch (err) {
    console.error('Error sending test notification:', err);
    res.status(500).json({ message: 'Failed to send test notification', error: (err as Error).message });
  }
});

/**
 * Test Slack integration with provided credentials
 */
router.post('/api/notifications/test-slack', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { slackBotToken, slackChannelId } = req.body;
    
    if (!slackBotToken || !slackChannelId) {
      return res.status(400).json({ 
        message: 'Missing required parameters: slackBotToken and slackChannelId' 
      });
    }
    
    // Create a temporary Slack client with the provided token
    const slackClient = new WebClient(slackBotToken);
    
    try {
      // Try to send a test message with the provided token and channel
      const result = await slackClient.chat.postMessage({
        channel: slackChannelId,
        text: "🔔 *BuopsoIT Test Message*\n\nThis is a test message to verify your Slack integration settings. If you're seeing this message, your Slack integration is configured correctly!",
        mrkdwn: true
      });
      
      if (result.ok) {
        res.json({ 
          success: true, 
          message: 'Test message sent successfully to Slack' 
        });
      } else {
        res.status(400).json({ 
          success: false, 
          message: `Failed to send test message: ${result.error || 'Unknown error'}` 
        });
      }
    } catch (slackError) {
      // Handle token/channel validation errors
      res.status(400).json({ 
        success: false, 
        message: `Slack API error: ${(slackError as Error).message}` 
      });
    }
  } catch (err) {
    console.error('Error testing Slack integration:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to test Slack integration', 
      error: (err as Error).message 
    });
  }
});

/**
 * Save notification configuration
 */
router.post('/api/notifications/config', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const { 
      // Slack settings
      slackEnabled, 
      slackBotToken, 
      slackChannelId, 
      
      // Legacy Email settings (for backward compatibility)
      emailEnabled,
      emailHost,
      emailPort,
      emailUser,
      emailPassword,
      emailFrom,
      emailSecure,
      
      // Multiple email accounts and mappings
      emailAccounts,
      notificationMappings
    } = req.body;
    
    // In a real-world scenario, you would save these configs to a database
    // For now, we'll use environment variables and in-memory storage
    
    // Configure Slack
    if (slackEnabled && slackBotToken && slackChannelId) {
      process.env.SLACK_BOT_TOKEN = slackBotToken;
      process.env.SLACK_CHANNEL_ID = slackChannelId;
      
      console.log('Slack integration enabled with new credentials');
    } else if (!slackEnabled) {
      // If Slack is disabled, remove the environment variables
      delete process.env.SLACK_BOT_TOKEN;
      delete process.env.SLACK_CHANNEL_ID;
      
      console.log('Slack integration disabled');
    }
    
    // Email configuration
    // Handle multiple email accounts if provided
    if (emailAccounts && Array.isArray(emailAccounts) && emailAccounts.length > 0) {
      console.log(`Configuring ${emailAccounts.length} email accounts`);
      
      // Import email service and set email accounts
      const { setEmailAccounts, setNotificationMappings } = await import('../services/email-service');
      
      // Store email accounts
      setEmailAccounts(emailAccounts);
      
      // Store notification mappings if available
      if (notificationMappings && Array.isArray(notificationMappings)) {
        setNotificationMappings(notificationMappings);
      }
      
      // Also set the legacy environment variables to the default account for backward compatibility
      const defaultAccount = emailAccounts.find(acc => acc.isDefault) || emailAccounts[0];
      if (defaultAccount) {
        process.env.EMAIL_HOST = defaultAccount.host;
        process.env.EMAIL_PORT = defaultAccount.port.toString();
        process.env.EMAIL_USER = defaultAccount.user;
        process.env.EMAIL_PASSWORD = defaultAccount.password;
        process.env.EMAIL_FROM = defaultAccount.from;
        process.env.EMAIL_SECURE = defaultAccount.secure ? 'true' : 'false';
      }
      
      console.log('Email integration enabled with multiple accounts');
    } 
    // Handle legacy email config if provided and no accounts are set
    else if (emailEnabled && emailHost && emailPort && emailUser && emailPassword && emailFrom) {
      process.env.EMAIL_HOST = emailHost;
      process.env.EMAIL_PORT = emailPort;
      process.env.EMAIL_USER = emailUser;
      process.env.EMAIL_PASSWORD = emailPassword;
      process.env.EMAIL_FROM = emailFrom;
      process.env.EMAIL_SECURE = emailSecure ? 'true' : 'false';
      
      // Import email service and set single account
      const { setEmailAccounts } = await import('../services/email-service');
      
      // Create a single account from legacy settings
      setEmailAccounts([{
        id: 'default-email-account',
        name: 'Default Email Account',
        host: emailHost,
        port: emailPort,
        user: emailUser,
        password: emailPassword,
        from: emailFrom,
        secure: emailSecure,
        isDefault: true
      }]);
      
      console.log('Email integration enabled with legacy credentials');
    } 
    // If email is disabled
    else if (!emailEnabled) {
      // If email is disabled, remove the environment variables
      delete process.env.EMAIL_HOST;
      delete process.env.EMAIL_PORT;
      delete process.env.EMAIL_USER;
      delete process.env.EMAIL_PASSWORD;
      delete process.env.EMAIL_FROM;
      delete process.env.EMAIL_SECURE;
      
      // Clear email accounts
      const { setEmailAccounts, setNotificationMappings } = await import('../services/email-service');
      setEmailAccounts([]);
      setNotificationMappings([]);
      
      console.log('Email integration disabled');
    }
    
    // Get configured accounts for response
    const { getEmailAccounts, getNotificationMappings } = await import('../services/email-service');
    const configuredAccounts = getEmailAccounts();
    
    res.json({ 
      success: true,
      message: 'Notification settings updated successfully',
      settings: {
        slack: {
          enabled: slackEnabled && !!process.env.SLACK_BOT_TOKEN && !!process.env.SLACK_CHANNEL_ID,
          configured: !!process.env.SLACK_BOT_TOKEN && !!process.env.SLACK_CHANNEL_ID
        },
        email: {
          enabled: emailEnabled && (configuredAccounts.length > 0 || (!!process.env.EMAIL_HOST && !!process.env.EMAIL_USER)),
          configured: configuredAccounts.length > 0 || (!!process.env.EMAIL_HOST && !!process.env.EMAIL_USER),
          accounts: configuredAccounts.length,
          mappings: getNotificationMappings().length
        }
      }
    });
  } catch (err) {
    console.error('Error saving notification config:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to save notification configuration', 
      error: (err as Error).message 
    });
  }
});

export default router;
import { type ChatPostMessageArguments, WebClient } from "@slack/web-api";

// Slack client instance
let slackClient: WebClient | null = null;

/**
 * Initialize the Slack client with the provided token
 * @param token Slack Bot Token
 */
export function initializeSlackClient(token: string): void {
  if (!token) {
    throw new Error("Slack Bot Token is required");
  }
  slackClient = new WebClient(token);
}

/**
 * Get the initialized Slack client
 * @returns WebClient instance
 * @throws Error if client is not initialized
 */
export function getSlackClient(): WebClient {
  if (!slackClient) {
    throw new Error("Slack client not initialized. Call initializeSlackClient first.");
  }
  return slackClient;
}

/**
 * Sends a structured message to a Slack channel using the Slack Web API
 * @param message Structured message to send
 * @returns Promise resolving to the sent message's timestamp
 */
export async function sendSlackMessage(
  message: ChatPostMessageArguments
): Promise<string | undefined> {
  try {
    const client = getSlackClient();
    const response = await client.chat.postMessage(message);
    return response.ts;
  } catch (error) {
    console.error('Error sending Slack message:', error);
    throw error;
  }
}

/**
 * Sends an alert notification to a Slack channel
 * @param channelId ID of the channel to send message to
 * @param alertTitle Title of the alert
 * @param alertMessage Main alert message content
 * @param severity Alert severity level (info, warning, error)
 * @returns Promise resolving to the sent message's timestamp
 */
export async function sendAlertToSlack(
  channelId: string,
  alertTitle: string,
  alertMessage: string,
  severity: 'info' | 'warning' | 'error' = 'info'
): Promise<string | undefined> {
  try {
    // Color coding based on severity
    const colorMap = {
      info: '#36c5f0',
      warning: '#ECB22E',
      error: '#E01E5A'
    };
    
    const color = colorMap[severity];
    
    // Create a formatted Slack message with blocks
    return await sendSlackMessage({
      channel: channelId,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🚨 IT Service Alert: ${alertTitle}`,
            emoji: true
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: alertMessage
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `*Severity:* ${severity.toUpperCase()} | *Time:* ${new Date().toLocaleString()}`
            }
          ]
        }
      ],
      attachments: [
        {
          color: color,
          blocks: [
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: 'This is an automated alert from your BuopsoIT monitoring system.'
                }
              ]
            }
          ]
        }
      ]
    });
  } catch (error) {
    console.error('Error sending alert to Slack:', error);
    throw error;
  }
}

/**
 * Validates Slack configuration by sending a test message
 * @param config Configuration object with token and channel ID
 * @returns Promise resolving to boolean indicating success
 */
export async function validateSlackConfig(config: {
  token: string;
  channelId: string;
}): Promise<boolean> {
  try {
    // Initialize with test token
    initializeSlackClient(config.token);
    
    // Send test message
    await sendSlackMessage({
      channel: config.channelId,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*BuopsoIT Slack Notification Test*'
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'If you can see this message, your Slack notification system is configured correctly.'
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'This is a test message from your BuopsoIT monitoring system.'
            }
          ]
        }
      ]
    });
    
    return true;
  } catch (error) {
    console.error('Error validating Slack configuration:', error);
    return false;
  }
}
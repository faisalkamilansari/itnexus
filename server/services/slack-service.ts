import { type ChatPostMessageArguments, WebClient } from "@slack/web-api";

// Lazily initialized Slack client to avoid errors if environment variables aren't set
let slackClient: WebClient | null = null;

/**
 * Gets an initialized Slack WebClient if the required environment variables are set
 * @returns WebClient instance or null if environment variables are not set
 */
function getSlackClient(): WebClient | null {
  if (slackClient) return slackClient;
  
  if (!process.env.SLACK_BOT_TOKEN) {
    console.warn("SLACK_BOT_TOKEN environment variable not set - Slack integration disabled");
    return null;
  }

  try {
    slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
    return slackClient;
  } catch (error) {
    console.error('Error initializing Slack client:', error);
    return null;
  }
}

/**
 * Checks if Slack integration is properly configured
 * @returns boolean indicating if Slack is configured
 */
export function isSlackConfigured(): boolean {
  return !!process.env.SLACK_BOT_TOKEN && !!process.env.SLACK_CHANNEL_ID;
}

/**
 * Sends a structured message to a Slack channel using the Slack Web API
 * @param message - Structured message to send
 * @returns Promise resolving to the sent message's timestamp or null if sending failed
 */
export async function sendSlackMessage(
  message: ChatPostMessageArguments
): Promise<string | null> {
  const client = getSlackClient();
  if (!client) return null;
  
  try {
    // Send the message
    const response = await client.chat.postMessage(message);
    console.log("Slack message sent successfully");
    
    // Return the timestamp of the sent message
    return response.ts as string || null;
  } catch (error) {
    console.error('Error sending Slack message:', error);
    return null;
  }
}

/**
 * Sends a ticket notification to Slack
 * @param options - Object containing notification details
 * @returns Promise resolving to the message timestamp or null if sending failed
 */
export async function sendTicketNotificationToSlack({
  ticketType,
  ticketId,
  title,
  description,
  status,
  priority,
  createdByUsername,
  assignedToUsername,
  tenantName
}: {
  ticketType: 'incident' | 'service_request' | 'change_request';
  ticketId: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdByUsername?: string;
  assignedToUsername?: string | null;
  tenantName?: string;
}): Promise<string | null> {
  if (!isSlackConfigured()) return null;
  
  const channelId = process.env.SLACK_CHANNEL_ID as string;
  
  // Create ticket type text with emoji
  let ticketTypeText = '';
  let colorCode = '';
  
  switch (ticketType) {
    case 'incident':
      ticketTypeText = '🚨 Incident';
      colorCode = '#E53E3E'; // Red
      break;
    case 'service_request':
      ticketTypeText = '🔧 Service Request';
      colorCode = '#3182CE'; // Blue
      break;
    case 'change_request':
      ticketTypeText = '📝 Change Request';
      colorCode = '#805AD5'; // Purple
      break;
  }
  
  // Create priority text with indicator
  let priorityText = '';
  switch (priority.toLowerCase()) {
    case 'critical':
      priorityText = '🔴 Critical';
      break;
    case 'high':
      priorityText = '🟠 High';
      break;
    case 'medium':
      priorityText = '🟡 Medium';
      break;
    case 'low':
      priorityText = '🟢 Low';
      break;
    default:
      priorityText = `⚪ ${priority}`;
  }
  
  // Format message
  const message: ChatPostMessageArguments = {
    channel: channelId,
    text: `New ${ticketTypeText}: ${title}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${ticketTypeText} #${ticketId}: ${title}`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*ID:*\n#${ticketId}`
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n${status}`
          },
          {
            type: 'mrkdwn',
            text: `*Priority:*\n${priorityText}`
          },
          {
            type: 'mrkdwn',
            text: `*Assigned To:*\n${assignedToUsername || 'Unassigned'}`
          }
        ]
      }
    ],
    attachments: [
      {
        color: colorCode,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Description:*\n${description}`
            }
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Created by ${createdByUsername || 'Unknown'} ${tenantName ? `| Tenant: ${tenantName}` : ''}`
              }
            ]
          }
        ]
      }
    ]
  };
  
  return sendSlackMessage(message);
}

/**
 * Reads the history of a channel
 * @param channelId - Channel ID to read message history from (defaults to configured channel)
 * @param messageLimit - Maximum number of messages to retrieve
 * @returns Promise resolving to the messages, or null if reading failed
 */
export async function readSlackHistory(
  channelId?: string,
  messageLimit: number = 100,
): Promise<any | null> {
  const client = getSlackClient();
  if (!client) return null;
  
  try {
    // Get messages from the configured channel or specified channel
    return await client.conversations.history({
      channel: channelId || process.env.SLACK_CHANNEL_ID as string,
      limit: messageLimit,
    });
  } catch (error) {
    console.error('Error reading Slack history:', error);
    return null;
  }
}
import { WebClient } from '@slack/web-api';

interface SlackUserProfile {
  status_text: string;
  status_emoji: string;
  status_expiration?: number;
  [key: string]: unknown;
}

let slackClient: WebClient | null = null;

function getSlackClient(): WebClient {
  if (!slackClient) {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
      throw new Error('SLACK_BOT_TOKEN environment variable is not set');
    }
    slackClient = new WebClient(token);
  }
  return slackClient;
}

export async function lookupSlackUserByEmail(email: string): Promise<string | null> {
  try {
    const client = getSlackClient();
    const response = await client.users.lookupByEmail({
      email: email,
    });
    
    if (response.ok && response.user) {
      return response.user.id as string;
    }
    
    console.error('Failed to lookup Slack user:', response.error);
    return null;
  } catch (error) {
    console.error('Error looking up Slack user by email:', error);
    return null;
  }
}

export async function updateSlackUserStatus(
  userId: string,
  statusText: string,
  statusEmoji: string = ':palm_tree:',
  statusExpiration?: number
): Promise<boolean> {
  try {
    const client = getSlackClient();
    
    const profile: SlackUserProfile = {
      status_text: statusText,
      status_emoji: statusEmoji,
    };
    
    if (statusExpiration) {
      profile.status_expiration = statusExpiration;
    }
    
    const response = await client.users.profile.set({
      user: userId,
      profile: profile,
    });
    
    if (response.ok) {
      console.log(`Successfully updated Slack status for user ${userId}`);
      return true;
    }
    
    console.error('Failed to update Slack status:', response.error);
    return false;
  } catch (error) {
    console.error('Error updating Slack user status:', error);
    return false;
  }
}

export async function clearSlackUserStatus(userId: string): Promise<boolean> {
  try {
    const client = getSlackClient();
    
    const profile: SlackUserProfile = {
      status_text: '',
      status_emoji: '',
      status_expiration: 0,
    };
    
    const response = await client.users.profile.set({
      user: userId,
      profile: profile,
    });
    
    if (response.ok) {
      console.log(`Successfully cleared Slack status for user ${userId}`);
      return true;
    }
    
    console.error('Failed to clear Slack status:', response.error);
    return false;
  } catch (error) {
    console.error('Error clearing Slack user status:', error);
    return false;
  }
}

export async function setSlackUserPresence(
  presence: 'auto' | 'away'
): Promise<boolean> {
  try {
    const client = getSlackClient();
    
    const response = await client.users.setPresence({
      presence: presence,
    });
    
    if (response.ok) {
      console.log(`Successfully set Slack presence to ${presence} for authenticated user`);
      return true;
    }
    
    console.error('Failed to set Slack presence:', response.error);
    return false;
  } catch (error) {
    console.error('Error setting Slack user presence:', error);
    return false;
  }
}

export function getLeaveTypeStatusEmoji(leaveType: string): string {
  switch (leaveType.toLowerCase()) {
    case 'annual':
    case 'vacation':
      return ':palm_tree:';
    case 'sick':
      return ':face_with_thermometer:';
    case 'personal':
      return ':house:';
    case 'maternity':
      return ':baby:';
    case 'paternity':
      return ':man-baby:';
    case 'public':
      return ':calendar:';
    default:
      return ':calendar:';
  }
}

export function formatStatusMessage(
  leaveType: string,
  endDate: string,
  userName?: string
): string {
  const typeDisplayMap: { [key: string]: string } = {
    annual: 'on vacation',
    vacation: 'on vacation',
    sick: 'out sick',
    personal: 'out on personal leave',
    maternity: 'on maternity leave',
    paternity: 'on paternity leave',
    public: 'out for public holiday',
  };
  
  const typeText = typeDisplayMap[leaveType.toLowerCase()] || 'out of office';
  const endDateFormatted = new Date(endDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  
  return `${typeText} until ${endDateFormatted}`;
}

export async function processSlackStatusUpdate(
  userEmail: string,
  slackEmail: string,
  leaveType: string,
  endDate: string,
  isStarting: boolean = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const slackUserId = await lookupSlackUserByEmail(slackEmail);
    
    if (!slackUserId) {
      return {
        success: false,
        error: `Could not find Slack user with email: ${slackEmail}`,
      };
    }
    
    if (isStarting) {
      const statusEmoji = getLeaveTypeStatusEmoji(leaveType);
      const statusText = formatStatusMessage(leaveType, endDate);
      
      const statusUpdated = await updateSlackUserStatus(
        slackUserId,
        statusText,
        statusEmoji
      );
      
      if (!statusUpdated) {
        return {
          success: false,
          error: 'Failed to update Slack status',
        };
      }
      
      await setSlackUserPresence('away');
      
      return { success: true };
    } else {
      const statusCleared = await clearSlackUserStatus(slackUserId);
      
      if (!statusCleared) {
        return {
          success: false,
          error: 'Failed to clear Slack status',
        };
      }
      
      await setSlackUserPresence('auto');
      
      return { success: true };
    }
  } catch (error) {
    console.error('Error processing Slack status update:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
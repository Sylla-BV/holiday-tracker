'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { users, holidayRequests } from '@/lib/schema';
import { eq, and, gte, lte, or } from 'drizzle-orm';
// Temporarily disabled AI suggestions
// import { suggestAlternativeDates } from '@/ai/flows/suggest-alternative-dates';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const requestSchema = z.object({
  startDate: z.date({
    required_error: 'Start date is required',
    invalid_type_error: 'Start date must be a valid date',
  }),
  endDate: z.date({
    required_error: 'End date is required',
    invalid_type_error: 'End date must be a valid date',
  }),
  leaveType: z.enum(['annual', 'sick', 'personal', 'maternity', 'paternity', 'other', 'public']),
  notes: z.string().optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'End date must be after or equal to start date',
  path: ['endDate'],
});

const updateStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['pending', 'approved', 'rejected']),
  approvedBy: z.string().uuid().optional(),
});

type RequestTimeOffInput = z.infer<typeof requestSchema>;
type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

/**
 * Get the current authenticated user's session
 * Returns null if no session exists
 */
async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user || null;
}

/**
 * Verify that the user is authenticated and return their user ID
 * Throws an error if not authenticated
 */
async function requireAuth(): Promise<string> {
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error('Authentication required');
  }
  return user.id;
}

/**
 * Get all users from the database
 */
export async function getUsers() {
  try {
    // Verify authentication
    await requireAuth();
    
    const allUsers = await db.select().from(users);
    return { success: true, data: allUsers };
  } catch (error) {
    console.error('Error fetching users:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch users';
    return { success: false, error: errorMessage };
  }
}

/**
 * Map database leave types to display strings
 */
function mapLeaveTypeToDisplay(dbType: string): string {
  switch (dbType) {
    case 'annual':
      return 'Vacation';
    case 'sick':
      return 'Sick Leave';
    case 'personal':
      return 'Personal';
    case 'maternity':
      return 'Maternity Leave';
    case 'paternity':
      return 'Paternity Leave';
    case 'public':
      return 'Public Holiday';
    default:
      return 'Other';
  }
}

/**
 * Map database status to display strings
 */
function mapStatusToDisplay(dbStatus: string): string {
  switch (dbStatus) {
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'pending':
    default:
      return 'Pending';
  }
}

/**
 * Get all holiday requests with user relations and formatted data
 */
export async function getHolidayRequests() {
  try {
    // Verify authentication
    await requireAuth();

    // Use Drizzle ORM's db.query syntax for left join and filtering
    const requests = await db.query.holidayRequests.findMany({
      with: { user: true },
      where: (table, { ne }) => ne(table.status, 'rejected'),
    });

    // Transform data on server-side to avoid client-side processing
    const transformedRequests = requests
      .filter(request => request.user) // Only include requests with valid users
      .map(request => ({
        id: request.id,
        startDate: new Date(request.startDate),
        endDate: new Date(request.endDate),
        type: mapLeaveTypeToDisplay(request.leaveType),
        status: mapStatusToDisplay(request.status),
        user: request.user!,
        // Keep original fields for backward compatibility
        leaveType: request.leaveType,
        dbStatus: request.status,
      }));

    return { success: true, data: transformedRequests };
  } catch (error) {
    console.error('Error fetching holiday requests:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch holiday requests';
    return { success: false, error: errorMessage };
  }
}

/**
 * Create a new holiday request in the database
 */
export async function createHolidayRequest(input: RequestTimeOffInput) {
  try {
    // Verify authentication first
    const userId = await requireAuth();
    
    const parsedInput = requestSchema.safeParse(input);
    if (!parsedInput.success) {
      return { success: false, error: 'Invalid input data', details: parsedInput.error.format() };
    }

    const { startDate, endDate, leaveType, notes } = parsedInput.data;

    const conflicts = await checkForConflicts(startDate, endDate);
    
    if (conflicts.hasConflict) {
      // AI suggestions temporarily disabled - just return conflict error
      return { success: false, error: 'Scheduling conflict detected. Please choose different dates.' };
      
      /* Temporarily disabled AI suggestions
      // Generate AI suggestions for alternative dates
      try {
        const allUsers = await db.query.users.findMany();
        const allRequests = await db.query.holidayRequests.findMany({
          where: (table, { eq }) => eq(table.status, 'approved'),
        });

        const teamDataForAI = allUsers.map(user => ({
          name: user.name || 'Unknown User',
          absences: allRequests
            .filter(req => req.userId === user.id)
            .map(req => ({
              start: req.startDate,
              end: req.endDate,
            })),
        }));

        const currentUser = allUsers.find(user => user.id === userId);
        const suggestions = await suggestAlternativeDates({
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          teamMembers: teamDataForAI,
          requesterName: currentUser?.name || 'User',
        });

        return { success: false, suggestions };
      } catch (aiError) {
        console.error('AI suggestion error:', aiError);
        return { success: false, error: 'Scheduling conflict detected, but could not generate suggestions.' };
      }
      */
    }

    // Create the holiday request
    const [newRequest] = await db
      .insert(holidayRequests)
      .values({
        userId,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        leaveType,
        notes: notes || null,
        status: 'pending',
      })
      .returning();

    // Revalidate the page to show updated data
    revalidatePath('/');
    
    return { success: true, data: newRequest };
  } catch (error) {
    console.error('Error creating holiday request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create holiday request';
    return { success: false, error: errorMessage };
  }
}

/**
 * Update the status of a holiday request (for admin approval)
 */
export async function updateHolidayRequestStatus(input: UpdateStatusInput) {
  try {
    // Verify authentication and get current user
    const currentUserId = await requireAuth();
    
    const parsedInput = updateStatusSchema.safeParse(input);
    if (!parsedInput.success) {
      return { success: false, error: 'Invalid input data', details: parsedInput.error.format() };
    }

    const { id, status, approvedBy } = parsedInput.data;

    // Get current user to check permissions (in future, check if user has admin role)
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'Authentication required' };
    }

    const [updatedRequest] = await db
      .update(holidayRequests)
      .set({
        status,
        approvedBy: approvedBy || currentUserId,
        updatedAt: new Date(),
      })
      .where(eq(holidayRequests.id, id))
      .returning();

    if (!updatedRequest) {
      return { success: false, error: 'Holiday request not found' };
    }

    // Revalidate the page to show updated data
    revalidatePath('/');
    
    return { success: true, data: updatedRequest };
  } catch (error) {
    console.error('Error updating holiday request status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update holiday request status';
    return { success: false, error: errorMessage };
  }
}

/**
 * Check for conflicts with existing approved holiday requests
 */
async function checkForConflicts(startDate: Date, endDate: Date): Promise<{ hasConflict: boolean; conflicts?: any[] }> {
  try {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const conflicts = await db.query.holidayRequests.findMany({
      columns: {
        id: true,
        startDate: true,
        endDate: true,
      },
      with: {
        user: {
          columns: {
            name: true
          }
        }
      },
      where: (table, { and, eq, lte, gte }) => and(
        eq(table.status, 'approved'),
        lte(table.startDate, endDateStr),
        gte(table.endDate, startDateStr)
      )
    });

    return {
      hasConflict: conflicts.length > 0,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    };
  } catch (error) {
    console.error('Error checking for conflicts:', error);
    return { hasConflict: false };
  }
}

/**
 * Main entry point for handling holiday requests from the frontend
 * Accepts Date objects and handles authentication
 */
export async function handleRequestTimeOff(input: { startDate: Date; endDate: Date; leaveType: string; notes?: string }) {
  try {
    // Verify authentication first
    await requireAuth();
    
    // Convert the input format to match our schema
    const mappedInput: RequestTimeOffInput = {
      startDate: input.startDate,
      endDate: input.endDate,
      leaveType: mapLeaveType(input.leaveType),
      notes: input.notes,
    };
    
    return await createHolidayRequest(mappedInput);
  } catch (error) {
    console.error('Error in handleRequestTimeOff:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process holiday request';
    return { success: false, error: errorMessage };
  }
}

/**
 * Map frontend leave types to database enum values
 */
function mapLeaveType(frontendType: string): 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'other' | 'public' {
  switch (frontendType.toLowerCase()) {
    case 'vacation':
      return 'annual';
    case 'sick leave':
      return 'sick';
    case 'personal':
    case 'personal day':
      return 'personal';
    case 'maternity':
    case 'maternity leave':
      return 'maternity';
    case 'paternity':
    case 'paternity leave':
      return 'paternity';
    case 'public holiday':
      return 'public';
    default:
      return 'other';
  }
}

/**
 * Send a message to Slack webhook
 */
export async function sendSlackMessage(message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.error('SLACK_WEBHOOK_URL environment variable is not set');
      return { success: false, error: 'Slack webhook URL not configured' };
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: message,
        username: 'Sylla Vacations Bot',
        icon_emoji: ':airplane:',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Slack webhook error:', response.status, errorText);
      return { success: false, error: `Slack API error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending Slack message:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to send Slack message';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get users who are out of office today
 */
export async function getUsersOutOfOfficeToday(): Promise<{ success: boolean; users?: any[]; error?: string }> {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const usersOutToday = await db
      .select({
        id: holidayRequests.id,
        userName: users.name,
        userEmail: users.email,
        startDate: holidayRequests.startDate,
        endDate: holidayRequests.endDate,
        leaveType: holidayRequests.leaveType,
      })
      .from(holidayRequests)
      .innerJoin(users, eq(holidayRequests.userId, users.id))
      .where(
        and(
          eq(holidayRequests.status, 'approved'),
          lte(holidayRequests.startDate, todayStr),
          gte(holidayRequests.endDate, todayStr)
        )
      );

    return { success: true, users: usersOutToday };
  } catch (error) {
    console.error('Error getting users out of office:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get out of office users';
    return { success: false, error: errorMessage };
  }
}

/**
 * Send daily out of office report to Slack
 */
export async function sendDailyOutOfOfficeReport(): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await getUsersOutOfOfficeToday();
    
    if (!result.success || !result.users) {
      return { success: false, error: result.error || 'Failed to get out of office users' };
    }

    // If no one is out of office, send a cheerful fallback message
    if (result.users.length === 0) {
      const today = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const message = `🎉 *Out of Office Report - ${today}*\n\nEveryone is present today!`;
      const slackResult = await sendSlackMessage(message);
      return slackResult;
    }

    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let message = `🏖️ *Out of Office Report - ${today}*\n\n`;
    
    result.users.forEach(user => {
      const startDate = new Date(user.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endDate = new Date(user.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const leaveTypeEmoji = getLeaveTypeEmoji(user.leaveType);
      
      message += `${leaveTypeEmoji} *${user.userName}* - ${user.leaveType} (${startDate} - ${endDate})\n`;
    });

    message += `\n_Total: ${result.users.length} team member${result.users.length > 1 ? 's' : ''} out today_`;

    const slackResult = await sendSlackMessage(message);
    return slackResult;
    
  } catch (error) {
    console.error('Error sending daily report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to send daily report';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get emoji for leave type
 */
function getLeaveTypeEmoji(leaveType: string): string {
  switch (leaveType) {
    case 'annual':
      return '🏖️';
    case 'sick':
      return '🤒';
    case 'personal':
      return '🏠';
    case 'maternity':
      return '👶';
    case 'paternity':
      return '👨‍👶';
    default:
      return '📅';
  }
}

/**
 * Admin action to update user role
 */
export async function updateUserRole(userId: string, role: 'admin' | 'member'): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUserId = await requireAuth();
    
    // Check if current user is admin
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, currentUserId),
    });

    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Admin access required' };
    }

    if (!userId || !role || !['admin', 'member'].includes(role)) {
      return { success: false, error: 'Invalid data' };
    }

    // Update user role
    const [updatedUser] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      return { success: false, error: 'User not found' };
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (error) {
    console.error('Error updating user role:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update user role';
    return { success: false, error: errorMessage };
  }
}

/**
 * Check for conflicts with existing approved holiday requests (public function)
 */
export async function checkHolidayConflicts(input: { startDate: Date; endDate: Date }): Promise<{ 
  success: boolean; 
  hasConflict: boolean; 
  conflicts?: Array<{ 
    id: string; 
    startDate: string; 
    endDate: string; 
    userName: string; 
  }>; 
  error?: string; 
}> {
  try {
    await requireAuth();
    
    const result = await checkForConflicts(input.startDate, input.endDate);
    
    return {
      success: true,
      hasConflict: result.hasConflict,
      conflicts: result.conflicts?.map(conflict => ({
        id: conflict.id,
        startDate: conflict.startDate,
        endDate: conflict.endDate,
        userName: conflict.user?.name || 'Unknown User',
      })),
    };
  } catch (error) {
    console.error('Error checking conflicts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to check conflicts';
    return { success: false, hasConflict: false, error: errorMessage };
  }
}

/**
 * Admin action to approve or reject holiday requests
 */
export async function updateRequestStatus(requestId: string, status: 'approved' | 'rejected'): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUserId = await requireAuth();
    
    // Check if current user is admin
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, currentUserId),
    });

    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Admin access required' };
    }

    if (!requestId || !status || !['approved', 'rejected'].includes(status)) {
      return { success: false, error: 'Invalid data' };
    }

    // Update the holiday request status
    const [updatedRequest] = await db
      .update(holidayRequests)
      .set({ 
        status, 
        approvedBy: currentUserId,
        updatedAt: new Date(),
      })
      .where(eq(holidayRequests.id, requestId))
      .returning();

    if (!updatedRequest) {
      return { success: false, error: 'Request not found' };
    }

    // Revalidate pages to show updated data
    revalidatePath('/admin');
    revalidatePath('/');
    
    return { success: true };
  } catch (error) {
    console.error('Error updating request status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update request status';
    return { success: false, error: errorMessage };
  }
}

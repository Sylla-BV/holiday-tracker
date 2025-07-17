'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { users, holidayRequests } from '@/lib/schema';
import { eq, and, gte, lte, or } from 'drizzle-orm';
import { publicHolidays } from '@/lib/schema';
import { sql, inArray } from 'drizzle-orm';
// Temporarily disabled AI suggestions
// import { suggestAlternativeDates } from '@/ai/flows/suggest-alternative-dates';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Public Holidays API Base URL
const HOLIDAYS_API_BASE_URL = 'https://date.nager.at/api/v3';

const requestSchema = z.object({
  startDate: z.string({
    required_error: 'Start date is required',
    invalid_type_error: 'Start date must be a valid date string',
  }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  endDate: z.string({
    required_error: 'End date is required',
    invalid_type_error: 'End date must be a valid date string',
  }).regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  leaveType: z.enum(['annual', 'sick', 'personal', 'maternity', 'paternity', 'other', 'public']),
  notes: z.string().optional(),
}).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
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
        ...request,
        type: mapLeaveTypeToDisplay(request.leaveType),
        status: mapStatusToDisplay(request.status),
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
 * Get public holidays for dashboard display
 */
export async function getPublicHolidays() {
  try {
    // Verify authentication
    await requireAuth();
    
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    // Get all unique countries from users
    const activeCountries = await db.selectDistinct({ country: users.country })
      .from(users)
      .where(sql`${users.country} IS NOT NULL`);

    const countries = activeCountries.map(row => row.country).filter((country): country is string => Boolean(country));
    
    if (countries.length === 0) {
      return { success: true, data: [] };
    }

    // Get holidays for all countries
    const holidays = await db.select()
      .from(publicHolidays)
      .where(
        and(
          inArray(publicHolidays.country, countries),
          inArray(publicHolidays.year, [currentYear, nextYear])
        )
      )
      .orderBy(publicHolidays.date);

    return { success: true, data: holidays };
  } catch (error) {
    console.error('Error fetching public holidays:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch public holidays';
    return { success: false, error: errorMessage };
  }
}

/**
 * Create a new holiday request in the database
 */
export async function createHolidayRequest(input: RequestTimeOffInput) {
  console.log('[Server] createHolidayRequest called with:', input);
  
  try {
    const userId = await requireAuth();
    console.log('[Server] Creating request for user:', userId);
    
    const parsedInput = requestSchema.safeParse(input);
    if (!parsedInput.success) {
      console.error('[Server] Input validation failed:', parsedInput.error.format());
      return { success: false, error: 'Invalid input data', details: parsedInput.error.format() };
    }

    const { startDate, endDate, leaveType, notes } = parsedInput.data;
    console.log('[Server] Parsed input:', { startDate, endDate, leaveType, notes });

    // Check if user is admin
    const isAdmin = await isUserAdmin(userId);
    console.log('[Server] User is admin:', isAdmin);

    const conflicts = await checkForConflicts(startDate, endDate);
    console.log('[Server] Conflicts check result:', conflicts);
    
    // Only check for conflicts - don't block submission
    // Admin requests are auto-approved regardless of conflicts
    // Non-admin requests can proceed with conflicts (manager will decide)

    // Create the holiday request with automatic approval for admins
    console.log('[Server] Inserting holiday request into database...');
    const [newRequest] = await db
      .insert(holidayRequests)
      .values({
        userId,
        startDate,
        endDate,
        leaveType,
        notes: notes || null,
        status: isAdmin ? 'approved' : 'pending',
        approvedBy: isAdmin ? userId : null,
      })
      .returning();

    console.log('[Server] Holiday request created successfully:', newRequest);

    // Revalidate the page to show updated data
    revalidatePath('/');
    
    return { success: true, data: newRequest };
  } catch (error) {
    console.error('[Server] Error creating holiday request:', error);
    if (error instanceof Error) {
      console.error('[Server] Error stack:', error.stack);
    }
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
 * Check if a user is an admin
 */
async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    return user?.role === 'admin';
  } catch (error) {
    console.error('Error checking user admin status:', error);
    return false;
  }
}

/**
 * Check for conflicts with existing approved holiday requests
 */
async function checkForConflicts(startDate: string, endDate: string): Promise<{ hasConflict: boolean; conflicts?: any[] }> {
  try {
    
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
        lte(table.startDate, endDate),
        gte(table.endDate, startDate)
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
export async function handleRequestTimeOff(input: { startDate: string; endDate: string; leaveType: string; notes?: string }) {
  console.log('[Server] handleRequestTimeOff called with:', input);
  
  try {
    const userId = await requireAuth();
    console.log('[Server] User authenticated:', userId);
    
    const mappedInput: RequestTimeOffInput = {
      startDate: input.startDate,
      endDate: input.endDate,
      leaveType: mapLeaveType(input.leaveType),
      notes: input.notes,
    };
    
    console.log('[Server] Mapped input:', mappedInput);
    
    const result = await createHolidayRequest(mappedInput);
    console.log('[Server] createHolidayRequest result:', result);
    
    return result;
  } catch (error) {
    console.error('[Server] Error in handleRequestTimeOff:', error);
    if (error instanceof Error) {
      console.error('[Server] Error stack:', error.stack);
    }
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
    const today = new Date().toISOString().split('T')[0];
    
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
          lte(holidayRequests.startDate, today),
          gte(holidayRequests.endDate, today)
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

    // If no one is out of office, return early without sending a message
    if (result.users.length === 0) {
      return { success: true };
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
export async function checkHolidayConflicts(input: { startDate: string; endDate: string }): Promise<{ 
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
 * Check for conflicts with public holidays
 */
export async function checkPublicHolidayConflicts(input: { startDate: string; endDate: string }): Promise<{ 
  success: boolean; 
  hasConflict: boolean; 
  publicHolidays?: Array<{ 
    id: string; 
    date: string; 
    name: string; 
    localName: string | null; 
    country: string; 
    type: string; 
  }>; 
  error?: string; 
}> {
  try {
    const currentUserId = await requireAuth();
    
    // Get the current user's country
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, currentUserId),
    });
    
    if (!currentUser?.country) {
      return { success: true, hasConflict: false };
    }
    
    const holidaysInRange = await db.select()
      .from(publicHolidays)
      .where(
        and(
          eq(publicHolidays.country, currentUser.country),
          sql`${publicHolidays.date} >= ${input.startDate}`,
          sql`${publicHolidays.date} <= ${input.endDate}`
        )
      )
      .orderBy(publicHolidays.date);
    
    return {
      success: true,
      hasConflict: holidaysInRange.length > 0,
      publicHolidays: holidaysInRange.map((holiday) => ({
        id: holiday.id,
        date: holiday.date,
        name: holiday.name,
        localName: holiday.localName,
        country: holiday.country,
        type: holiday.type,
      })),
    };
  } catch (error) {
    console.error('Error checking public holiday conflicts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to check public holiday conflicts';
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

/**
 * Get all holiday requests for the current user (or specific user if admin)
 */
export async function getUserTimeOffRequests(userId?: string): Promise<{ 
  success: boolean; 
  data?: Array<{
    id: string;
    startDate: string;
    endDate: string;
    leaveType: string;
    type: string;
    notes: string | null;
    status: string;
    dbStatus: string;
    createdAt: Date;
    updatedAt: Date;
    approvedBy: string | null;
    user: {
      id: string;
      name: string | null;
      email: string | null;
    } | null;
  }>; 
  error?: string; 
}> {
  try {
    const currentUserId = await requireAuth();
    
    // Determine which user's requests to fetch
    let targetUserId = currentUserId;
    
    if (userId && userId !== currentUserId) {
      // Check if current user is admin to access another user's requests
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, currentUserId),
      });
      
      if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, error: 'Admin access required to view other users requests' };
      }
      
      targetUserId = userId;
    }

    // Fetch the user's holiday requests
    const requests = await db.query.holidayRequests.findMany({
      with: { user: true },
      where: (table, { eq }) => eq(table.userId, targetUserId),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });

    // Transform data to match the expected format
    const transformedRequests = requests.map(request => ({
      ...request,
      type: mapLeaveTypeToDisplay(request.leaveType),
      status: mapStatusToDisplay(request.status),
      dbStatus: request.status,
    }));

    return { success: true, data: transformedRequests };
  } catch (error) {
    console.error('Error fetching user time off requests:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch time off requests';
    return { success: false, error: errorMessage };
  }
}

/**
 * Cancel a pending or future approved holiday request
 */
export async function cancelHolidayRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUserId = await requireAuth();
    
    // Validate input
    if (!requestId) {
      return { success: false, error: 'Request ID is required' };
    }

    // Find the request to ensure it exists and get its details
    const request = await db.query.holidayRequests.findFirst({
      where: eq(holidayRequests.id, requestId),
    });

    if (!request) {
      return { success: false, error: 'Holiday request not found' };
    }

    // Check if the current user owns this request or is an admin
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, currentUserId),
    });

    const isAdmin = currentUser?.role === 'admin';
    const isOwner = request.userId === currentUserId;

    if (!isOwner && !isAdmin) {
      return { success: false, error: 'You can only cancel your own holiday requests' };
    }

    // Check if the request can be cancelled (not already rejected or past)
    if (request.status === 'rejected') {
      return { success: false, error: 'Cannot cancel an already rejected request' };
    }

    // Check if the request is in the past
    const today = new Date().toISOString().split('T')[0];
    if (request.startDate < today) {
      return { success: false, error: 'Cannot cancel a request that has already started' };
    }

    // Update the request status to rejected (cancelled)
    const [updatedRequest] = await db
      .update(holidayRequests)
      .set({ 
        status: 'rejected',
        updatedAt: new Date(),
      })
      .where(eq(holidayRequests.id, requestId))
      .returning();

    if (!updatedRequest) {
      return { success: false, error: 'Failed to cancel holiday request' };
    }

    // Revalidate pages to show updated data
    revalidatePath('/my-time-off');
    revalidatePath('/');
    
    return { success: true };
  } catch (error) {
    console.error('Error cancelling holiday request:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to cancel holiday request';
    return { success: false, error: errorMessage };
  }
}

/**
 * Calculate PTO balance for user (mock calculation for now since we don't have accrual rules)
 */
export async function calculatePtoBalance(userId?: string): Promise<{ 
  success: boolean; 
  data?: {
    totalAllowance: number;
    usedDays: number;
    remainingDays: number;
    pendingDays: number;
    details: {
      approvedRequests: number;
      pendingRequests: number;
    };
  }; 
  error?: string; 
}> {
  try {
    const currentUserId = await requireAuth();
    
    // Determine which user's balance to calculate
    let targetUserId = currentUserId;
    
    if (userId && userId !== currentUserId) {
      // Check if current user is admin to access another user's balance
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, currentUserId),
      });
      
      if (!currentUser || currentUser.role !== 'admin') {
        return { success: false, error: 'Admin access required to view other users PTO balance' };
      }
      
      targetUserId = userId;
    }

    // Get the current year for calculation
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd = `${currentYear}-12-31`;

    // Get the target user's country for public holidays
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });
    
    let publicHolidays: Array<{ date: string }> = [];
    if (targetUser?.country) {
      try {
        const result = await getStoredPublicHolidays(targetUser.country, currentYear);
        if (result.success && result.data) {
          publicHolidays = result.data;
        }
      } catch (error) {
        console.error('Error fetching public holidays for PTO calculation:', error);
        // Continue without public holidays if fetch fails
      }
    }

    // Fetch approved requests for the current year
    const approvedRequests = await db.query.holidayRequests.findMany({
      where: (table, { and, eq, gte, lte }) => and(
        eq(table.userId, targetUserId),
        eq(table.status, 'approved'),
        eq(table.leaveType, 'annual'), // Only count annual leave for PTO balance
        gte(table.startDate, yearStart),
        lte(table.startDate, yearEnd)
      ),
    });

    // Fetch pending requests for the current year
    const pendingRequests = await db.query.holidayRequests.findMany({
      where: (table, { and, eq, gte, lte }) => and(
        eq(table.userId, targetUserId),
        eq(table.status, 'pending'),
        eq(table.leaveType, 'annual'), // Only count annual leave for PTO balance
        gte(table.startDate, yearStart),
        lte(table.startDate, yearEnd)
      ),
    });

    // Create a Set of public holiday dates for fast lookup
    const publicHolidayDates = new Set(publicHolidays.map(holiday => holiday.date));

    // Calculate weekdays only (excluding weekends and public holidays) for vacation requests
    const calculateWeekdays = (requests: typeof approvedRequests) => {
      return requests.reduce((total, request) => {
        const startDate = new Date(request.startDate);
        const endDate = new Date(request.endDate);
        
        let weekdaysCount = 0;
        let currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
          const dayOfWeek = currentDate.getDay();
          
          // Only count weekdays (Monday-Friday) that are not public holidays
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            // Format date as YYYY-MM-DD to match public holiday format
            const dateString = currentDate.toISOString().split('T')[0];
            
            // Only count if it's not a public holiday
            if (!publicHolidayDates.has(dateString)) {
              weekdaysCount++;
            }
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return total + weekdaysCount;
      }, 0);
    };

    const usedDays = calculateWeekdays(approvedRequests);
    const pendingDays = calculateWeekdays(pendingRequests);

    // Mock total allowance (in a real system, this would come from user settings or company policy)
    const totalAllowance = 25; // Standard 25 working days per year
    const remainingDays = Math.max(0, totalAllowance - usedDays);

    const balanceData = {
      totalAllowance,
      usedDays,
      remainingDays,
      pendingDays,
      details: {
        approvedRequests: approvedRequests.length,
        pendingRequests: pendingRequests.length,
      },
    };

    return { success: true, data: balanceData };
  } catch (error) {
    console.error('Error calculating PTO balance:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to calculate PTO balance';
    return { success: false, error: errorMessage };
  }
}

/**
 * Fetch public holidays from API and store in database
 */
export async function fetchAndStorePublicHolidays(countryCode: string, year: number) {
  try {
    await requireAuth();
    
    // Fetch from API
    const response = await fetch(`${HOLIDAYS_API_BASE_URL}/PublicHolidays/${year}/${countryCode}`, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch holidays: ${response.statusText}`);
    }

    const holidays = await response.json();
    
    // Store in database
    if (holidays.length > 0) {
      const dbHolidays = holidays.map((holiday: any) => ({
        country: holiday.countryCode,
        date: holiday.date,
        name: holiday.name,
        localName: holiday.localName,
        type: holiday.type,
        year: new Date(holiday.date).getFullYear(),
      }));

      await db.insert(publicHolidays)
        .values(dbHolidays)
        .onConflictDoUpdate({
          target: [publicHolidays.country, publicHolidays.date],
          set: {
            name: sql`excluded.name`,
            localName: sql`excluded.local_name`,
            type: sql`excluded.type`,
            updatedAt: sql`now()`,
          },
        });
    }

    return { success: true, data: holidays };
  } catch (error) {
    console.error('Error fetching and storing holidays:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch holidays';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get stored public holidays for a country and year
 */
export async function getStoredPublicHolidays(countryCode: string, year: number) {
  try {
    await requireAuth();
    
    const holidays = await db.select()
      .from(publicHolidays)
      .where(
        and(
          eq(publicHolidays.country, countryCode),
          eq(publicHolidays.year, year)
        )
      )
      .orderBy(publicHolidays.date);

    return { success: true, data: holidays };
  } catch (error) {
    console.error('Error fetching stored holidays:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stored holidays';
    return { success: false, error: errorMessage };
  }
}

/**
 * Sync holidays for all active user countries
 */
export async function syncPublicHolidays() {
  try {
    await requireAuth();
    
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    
    // Get all unique countries from users
    const activeCountries = await db.selectDistinct({ country: users.country })
      .from(users)
      .where(sql`${users.country} IS NOT NULL`);

    const countries = activeCountries.map(row => row.country).filter((country): country is string => Boolean(country));
    
    if (countries.length === 0) {
      return { success: true, message: 'No active countries found' };
    }

    // Fetch and store holidays for each country
    for (const country of countries) {
      for (const year of [currentYear, nextYear]) {
        await fetchAndStorePublicHolidays(country, year);
      }
    }

    return { success: true, message: `Synced holidays for ${countries.length} countries` };
  } catch (error) {
    console.error('Error syncing holidays:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to sync holidays';
    return { success: false, error: errorMessage };
  }
}

/**
 * Admin-only: Add a new public holiday
 */
export async function addPublicHoliday(holidayData: {
  country: string;
  date: string;
  name: string;
  localName?: string;
  type: string;
}) {
  try {
    const currentUserId = await requireAuth();
    
    // Check if current user is admin
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, currentUserId),
    });

    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Admin access required' };
    }

    // Validate input
    if (!holidayData.country || !holidayData.date || !holidayData.name || !holidayData.type) {
      return { success: false, error: 'Country, date, name, and type are required' };
    }

    // Check if holiday already exists
    const existing = await db.select()
      .from(publicHolidays)
      .where(
        and(
          eq(publicHolidays.country, holidayData.country),
          eq(publicHolidays.date, holidayData.date)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return { success: false, error: 'Holiday already exists for this date and country' };
    }

    // Add the holiday
    const [newHoliday] = await db.insert(publicHolidays)
      .values({
        country: holidayData.country,
        date: holidayData.date,
        name: holidayData.name,
        localName: holidayData.localName || null,
        type: holidayData.type,
        year: new Date(holidayData.date).getFullYear(),
      })
      .returning();

    return { success: true, data: newHoliday };
  } catch (error) {
    console.error('Error adding public holiday:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to add public holiday';
    return { success: false, error: errorMessage };
  }
}

/**
 * Admin-only: Update an existing public holiday
 */
export async function updatePublicHoliday(id: string, holidayData: {
  country?: string;
  date?: string;
  name?: string;
  localName?: string;
  type?: string;
}) {
  try {
    const currentUserId = await requireAuth();
    
    // Check if current user is admin
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, currentUserId),
    });

    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Admin access required' };
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (holidayData.country) updateData.country = holidayData.country;
    if (holidayData.date) {
      updateData.date = holidayData.date;
      updateData.year = new Date(holidayData.date).getFullYear();
    }
    if (holidayData.name) updateData.name = holidayData.name;
    if (holidayData.localName !== undefined) updateData.localName = holidayData.localName;
    if (holidayData.type) updateData.type = holidayData.type;

    // Update the holiday
    const [updatedHoliday] = await db
      .update(publicHolidays)
      .set(updateData)
      .where(eq(publicHolidays.id, id))
      .returning();

    if (!updatedHoliday) {
      return { success: false, error: 'Holiday not found' };
    }

    return { success: true, data: updatedHoliday };
  } catch (error) {
    console.error('Error updating public holiday:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update public holiday';
    return { success: false, error: errorMessage };
  }
}

/**
 * Admin-only: Delete a public holiday
 */
export async function deletePublicHoliday(id: string) {
  try {
    const currentUserId = await requireAuth();
    
    // Check if current user is admin
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, currentUserId),
    });

    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Admin access required' };
    }

    // Delete the holiday
    const [deletedHoliday] = await db
      .delete(publicHolidays)
      .where(eq(publicHolidays.id, id))
      .returning();

    if (!deletedHoliday) {
      return { success: false, error: 'Holiday not found' };
    }

    return { success: true, data: deletedHoliday };
  } catch (error) {
    console.error('Error deleting public holiday:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete public holiday';
    return { success: false, error: errorMessage };
  }
}

/**
 * Admin-only: Get all public holidays with filtering options
 */
export async function getHolidaysForAdmin(filters?: {
  country?: string;
  year?: number;
  search?: string;
}) {
  try {
    const currentUserId = await requireAuth();
    
    // Check if current user is admin
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, currentUserId),
    });

    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Admin access required' };
    }

    const conditions = [];
    
    if (filters?.country) {
      conditions.push(eq(publicHolidays.country, filters.country));
    }
    
    if (filters?.year) {
      conditions.push(eq(publicHolidays.year, filters.year));
    }
    
    if (filters?.search) {
      conditions.push(
        sql`${publicHolidays.name} ILIKE ${`%${filters.search}%`} OR ${publicHolidays.localName} ILIKE ${`%${filters.search}%`}`
      );
    }
    
    let holidays;
    if (conditions.length > 0) {
      holidays = await db.select()
        .from(publicHolidays)
        .where(and(...conditions))
        .orderBy(publicHolidays.date);
    } else {
      holidays = await db.select()
        .from(publicHolidays)
        .orderBy(publicHolidays.date);
    }

    return { success: true, data: holidays };
  } catch (error) {
    console.error('Error getting holidays for admin:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to get holidays';
    return { success: false, error: errorMessage };
  }
}

/**
 * Admin-only: Delete multiple public holidays
 */
export async function deleteMultipleHolidays(ids: string[]) {
  try {
    const currentUserId = await requireAuth();
    
    // Check if current user is admin
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, currentUserId),
    });

    if (!currentUser || currentUser.role !== 'admin') {
      return { success: false, error: 'Admin access required' };
    }

    if (!ids || ids.length === 0) {
      return { success: false, error: 'No holiday IDs provided' };
    }

    // Delete the holidays
    const deletedHolidays = await db
      .delete(publicHolidays)
      .where(inArray(publicHolidays.id, ids))
      .returning();

    return { 
      success: true, 
      data: deletedHolidays,
      message: `Successfully deleted ${deletedHolidays.length} holiday(s)`
    };
  } catch (error) {
    console.error('Error deleting multiple holidays:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete holidays';
    return { success: false, error: errorMessage };
  }
}

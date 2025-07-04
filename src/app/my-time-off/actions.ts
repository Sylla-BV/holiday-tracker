'use server';

import { db } from '@/lib/db';
import { users, holidayRequests } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

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
 * Get current user's holiday requests
 */
export async function getUserHolidayRequests() {
  try {
    const userId = await requireAuth();

    // Get all holiday requests for the current user
    const requests = await db.query.holidayRequests.findMany({
      where: eq(holidayRequests.userId, userId),
      with: { user: true },
    });

    // Transform data on server-side
    const transformedRequests = requests.map(request => ({
      ...request,
      type: mapLeaveTypeToDisplay(request.leaveType),
      status: mapStatusToDisplay(request.status),
      dbStatus: request.status,
    }));

    return { success: true, data: transformedRequests };
  } catch (error) {
    console.error('Error fetching user holiday requests:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch holiday requests';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get current user's profile information
 */
export async function getCurrentUserProfile() {
  try {
    const userId = await requireAuth();

    const userProfile = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!userProfile) {
      return { success: false, error: 'User profile not found' };
    }

    return { success: true, data: userProfile };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user profile';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get current user's PTO balance and usage statistics
 */
export async function getUserPtoStats() {
  try {
    const userId = await requireAuth();
    const currentYear = new Date().getFullYear();

    // Get all approved vacation requests for the current year (excluding sick leave and public holidays)
    const approvedRequests = await db.query.holidayRequests.findMany({
      where: (table, { and, eq, gte, lte }) => and(
        eq(table.userId, userId),
        eq(table.status, 'approved'),
        eq(table.leaveType, 'annual'), // Only count vacation days, not sick leave or public holidays
        gte(table.startDate, `${currentYear}-01-01`),
        lte(table.startDate, `${currentYear}-12-31`)
      ),
    });

    // Calculate used weekdays only (excluding weekends)
    const usedDays = approvedRequests.reduce((total, request) => {
      const startDate = new Date(request.startDate);
      const endDate = new Date(request.endDate);
      
      let weekdaysCount = 0;
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        // 0 = Sunday, 6 = Saturday, so we want 1-5 (Monday-Friday)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          weekdaysCount++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return total + weekdaysCount;
    }, 0);

    // Mock PTO allocation (in a real app, this would be configured per user)
    const totalAllocation = 25; // 25 working days per year
    const remainingDays = totalAllocation - usedDays;

    return {
      success: true,
      data: {
        totalAllocation,
        usedDays,
        remainingDays,
        approvedRequests: approvedRequests.length,
        pendingRequests: await getPendingRequestsCount(userId),
        currentYear,
      }
    };
  } catch (error) {
    console.error('Error fetching PTO stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch PTO statistics';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get count of pending vacation requests for a user (excluding sick leave and public holidays)
 */
async function getPendingRequestsCount(userId: string): Promise<number> {
  try {
    const pendingRequests = await db.query.holidayRequests.findMany({
      where: (table, { and, eq }) => and(
        eq(table.userId, userId),
        eq(table.status, 'pending'),
        eq(table.leaveType, 'annual') // Only count vacation requests
      ),
    });
    return pendingRequests.length;
  } catch (error) {
    console.error('Error counting pending requests:', error);
    return 0;
  }
}
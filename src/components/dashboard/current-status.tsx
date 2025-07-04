'use client';

import { use } from 'react';
import type { User, TransformedHolidayRequest } from '@/lib/schema';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isWithinInterval, format } from 'date-fns';
import { CalendarX } from 'lucide-react';

type CurrentStatusProps = {
  usersPromise: Promise<{ success: boolean; data?: User[]; error?: string }>;
  holidayRequestsPromise: Promise<{ success: boolean; data?: TransformedHolidayRequest[]; error?: string }>;
};

export default function CurrentStatus({ usersPromise, holidayRequestsPromise }: CurrentStatusProps) {
  const today = new Date();
  
  const usersResult = use(usersPromise);
  const holidayRequestsResult = use(holidayRequestsPromise);

  if (!usersResult.success || !holidayRequestsResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Who's Away Today?</CardTitle>
          <CardDescription>{format(today, 'MMMM d, yyyy')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 p-8">
            <h3 className="text-lg font-semibold mb-2">Error Loading Status</h3>
            <p className="text-sm">
              {!usersResult.success && usersResult.error}
              {!holidayRequestsResult.success && holidayRequestsResult.error}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const users = usersResult.data || [];
  const holidayRequests = holidayRequestsResult.data || [];
  
  // Get approved requests that are active today
  const activeRequests = holidayRequests.filter(request => 
    request.status === 'Approved' && 
    request.user &&
    isWithinInterval(today, { 
      start: request.startDate, 
      end: request.endDate 
    })
  );

  // Get users who are currently on leave
  const membersOnLeave = activeRequests.map(request => ({
    user: request.user!,
    request: request
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Who's Away Today?</CardTitle>
        <CardDescription>{format(today, 'MMMM d, yyyy')}</CardDescription>
      </CardHeader>
      <CardContent>
        {membersOnLeave.length > 0 ? (
          <ul className="space-y-4">
            {membersOnLeave.map(({ user, request }) => (
              <li key={user.id} className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={user.image || ''} alt={user.name || ''} data-ai-hint="person portrait" />
                  <AvatarFallback>{(user.name || 'U').charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{user.name || 'Unknown User'}</p>
                  <p className="text-sm text-muted-foreground">
                    Back on {format(request.endDate, 'MMM d')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground py-8">
            <CalendarX className="w-12 h-12 mb-4" />
            <p className="font-semibold">Everyone is available!</p>
            <p className="text-sm">No team members are on leave today.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

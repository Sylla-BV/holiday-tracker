'use client';

import { use } from 'react';
import type { User, TransformedHolidayRequest } from '@/lib/schema';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, isFuture } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

type AbsencesTableProps = {
  usersPromise: Promise<{ success: boolean; data?: User[]; error?: string }>;
  holidayRequestsPromise: Promise<{ success: boolean; data?: TransformedHolidayRequest[]; error?: string }>;
};

export default function AbsencesTable({ usersPromise, holidayRequestsPromise }: AbsencesTableProps) {
  const usersResult = use(usersPromise);
  const holidayRequestsResult = use(holidayRequestsPromise);

  if (!usersResult.success || !holidayRequestsResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Absences</CardTitle>
          <CardDescription>A list of scheduled time off for the team.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 p-8">
            <h3 className="text-lg font-semibold mb-2">Error Loading Absences</h3>
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

  // Data is already transformed on the server-side, just need filtering and sorting
  const allAbsences = holidayRequests
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .filter(absence => isFuture(new Date(absence.endDate)) || absence.status === 'Pending');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Absences</CardTitle>
        <CardDescription>A list of scheduled time off for the team.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allAbsences.length > 0 ? (
              allAbsences.map(absence => (
                <TableRow key={absence.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={absence.user.image || ''} alt={absence.user.name || ''} data-ai-hint="person portrait" />
                        <AvatarFallback>{(absence.user.name || 'U').charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{absence.user.name || 'Unknown User'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(absence.startDate, 'MMM d')} - {format(absence.endDate, 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>{absence.type}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={absence.status === 'Approved' ? 'default' : absence.status === 'Pending' ? 'secondary' : 'destructive'} className={`${absence.status === 'Approved' ? 'bg-green-100 text-green-800' : absence.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                      {absence.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  No upcoming absences.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


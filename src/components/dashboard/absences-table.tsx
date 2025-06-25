import type { User, HolidayRequest } from '@/lib/schema';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, isFuture } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

type AbsencesTableProps = {
  users: User[];
  holidayRequests: Array<HolidayRequest & { user: User | null }>;
};

export default function AbsencesTable({ users, holidayRequests }: AbsencesTableProps) {
  const allAbsences = holidayRequests
    .filter(request => request.user) // Only include requests with valid users
    .map(request => ({
      id: request.id,
      startDate: new Date(request.startDate),
      endDate: new Date(request.endDate),
      type: mapLeaveTypeToDisplay(request.leaveType),
      status: mapStatusToDisplay(request.status),
      user: request.user!,
    }))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .filter(absence => isFuture(absence.endDate) || absence.status === 'Pending');

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
    default:
      return 'Other';
  }
}

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

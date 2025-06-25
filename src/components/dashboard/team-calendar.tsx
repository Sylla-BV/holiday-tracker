'use client';

import React, { useState } from 'react';
import type { User, HolidayRequest } from '@/lib/schema';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { isSameDay, isWithinInterval, format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { CalendarDays } from 'lucide-react';

type TeamCalendarProps = {
  users: User[];
  holidayRequests: Array<HolidayRequest & { user: User | null }>;
  className?: string;
};

export default function TeamCalendar({ users, holidayRequests, className }: TeamCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const allAbsences = holidayRequests
    .filter(request => request.user) // Only include requests with valid users
    .map(request => ({
      id: request.id,
      startDate: new Date(request.startDate),
      endDate: new Date(request.endDate),
      type: mapLeaveTypeToDisplay(request.leaveType),
      status: mapStatusToDisplay(request.status),
      user: request.user!,
    }));

  const modifiers = {
    vacation: allAbsences
      .filter(a => a.type === 'Vacation' && a.status === 'Approved')
      .map(a => ({ from: a.startDate, to: a.endDate })),
    sick: allAbsences
      .filter(a => a.type === 'Sick Leave' && a.status === 'Approved')
      .map(a => ({ from: a.startDate, to: a.endDate })),
    personal: allAbsences
      .filter(a => a.type === 'Personal' && a.status === 'Approved')
      .map(a => ({ from: a.startDate, to: a.endDate })),
    pending: allAbsences
      .filter(a => a.status === 'Pending')
      .map(a => ({ from: a.startDate, to: a.endDate })),
  };

  const modifierStyles = {
    vacation: { backgroundColor: 'hsl(var(--primary) / 0.2)', color: 'hsl(var(--primary))' },
    sick: { backgroundColor: 'hsl(var(--accent) / 0.2)', color: 'hsl(var(--accent))' },
    personal: { backgroundColor: 'hsl(var(--secondary))', color: 'hsl(var(--secondary-foreground))' },
    pending: { border: '2px dashed hsl(var(--muted-foreground))' },
  };
  
  const absencesOnSelectedDay = allAbsences.filter(absence => 
    isWithinInterval(selectedDate, { start: absence.startDate, end: absence.endDate })
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Team Absence Calendar</CardTitle>
        <CardDescription>Click on a date to see who is away.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(day) => day && setSelectedDate(day)}
            modifiers={modifiers}
            modifiersStyles={modifierStyles}
            className="rounded-md border"
          />
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">{format(selectedDate, 'MMMM d, yyyy')}</h3>
          {absencesOnSelectedDay.length > 0 ? (
            <ul className="space-y-4">
              {absencesOnSelectedDay.map(absence => (
                <li key={absence.id} className="flex items-start gap-4 p-3 rounded-lg bg-secondary/50">
                   <Avatar>
                    <AvatarImage src={absence.user.image || ''} alt={absence.user.name || ''} data-ai-hint="person portrait" />
                    <AvatarFallback>{(absence.user.name || 'U').charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{absence.user.name || 'Unknown User'}</p>
                    <p className="text-sm text-muted-foreground">{absence.type}</p>
                    <Badge variant={absence.status === 'Approved' ? 'default' : 'secondary'} className={`mt-1 text-xs ${absence.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {absence.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground pt-10">
                <CalendarDays className="w-12 h-12 mb-4" />
                <p>No one is away on this day.</p>
            </div>
          )}
        </div>
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

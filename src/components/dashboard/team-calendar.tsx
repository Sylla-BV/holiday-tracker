'use client';

import React, { useState, use } from 'react';
import type { User, TransformedHolidayRequest, PublicHoliday } from '@/lib/schema';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { isSameDay, isWithinInterval, format, startOfDay } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { CalendarDays, MapPin } from 'lucide-react';

type TeamCalendarProps = {
  usersPromise: Promise<{ success: boolean; data?: User[]; error?: string }>;
  holidayRequestsPromise: Promise<{ success: boolean; data?: TransformedHolidayRequest[]; error?: string }>;
  publicHolidaysPromise: Promise<{ success: boolean; data?: PublicHoliday[]; error?: string }>;
  className?: string;
};

export default function TeamCalendar({ usersPromise, holidayRequestsPromise, publicHolidaysPromise, className }: TeamCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const usersResult = use(usersPromise);
  const holidayRequestsResult = use(holidayRequestsPromise);
  const publicHolidaysResult = use(publicHolidaysPromise);

  if (!usersResult.success || !holidayRequestsResult.success || !publicHolidaysResult.success) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Team Absence Calendar</CardTitle>
          <CardDescription>Click on a date to see who is away.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 p-8">
            <h3 className="text-lg font-semibold mb-2">Error Loading Calendar</h3>
            <p className="text-sm">
              {!usersResult.success && usersResult.error}
              {!holidayRequestsResult.success && holidayRequestsResult.error}
              {!publicHolidaysResult.success && publicHolidaysResult.error}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const holidayRequests = holidayRequestsResult.data || [];
  const publicHolidays = publicHolidaysResult.data || [];

  // Data is already transformed on the server-side
  const allAbsences = holidayRequests;

  const modifiers = {
    approved: allAbsences
      .filter(a => a.status === 'Approved')
      .map(a => ({ from: new Date(a.startDate), to: new Date(a.endDate) })),
    pending: allAbsences
      .filter(a => a.status === 'Pending')
      .map(a => ({ from: new Date(a.startDate), to: new Date(a.endDate) })),
    publicHoliday: publicHolidays
      .map(h => new Date(h.date)),
  };

  const modifierStyles = {
    approved: { backgroundColor: 'hsl(var(--accent) / 0.5)', color: 'hsl(var(--accent-foreground))' },
    pending: { border: '2px dashed hsl(var(--muted-foreground))', backgroundColor: 'hsl(var(--muted) / 0.2)' },
    publicHoliday: { backgroundColor: 'hsl(var(--destructive) / 0.3)', color: 'hsl(var(--destructive-foreground))', fontWeight: 'bold' },
  };

  const absencesOnSelectedDay = allAbsences.filter(absence => 
    isWithinInterval(startOfDay(selectedDate), { 
      start: startOfDay(new Date(absence.startDate)), 
      end: startOfDay(new Date(absence.endDate)) 
    })
  );

  const publicHolidaysOnSelectedDay = publicHolidays.filter(holiday => 
    isSameDay(new Date(holiday.date), selectedDate)
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
          
          {/* Public Holidays Section */}
          {publicHolidaysOnSelectedDay.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Public Holidays</h4>
              <ul className="space-y-2">
                {publicHolidaysOnSelectedDay.map(holiday => (
                  <li key={holiday.id} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                    <MapPin className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-900">{holiday.name}</p>
                      <p className="text-sm text-red-700">{holiday.localName}</p>
                      <Badge variant="destructive" className="mt-1 text-xs">
                        {holiday.country} • {holiday.type}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Team Absences Section */}
          {absencesOnSelectedDay.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Team Absences</h4>
              <ul className="space-y-3">
                {absencesOnSelectedDay.map(absence => (
                  <li key={absence.id} className="flex items-start gap-4 p-3 rounded-lg bg-secondary/10">
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
            </div>
          )}

          {/* Empty State */}
          {absencesOnSelectedDay.length === 0 && publicHolidaysOnSelectedDay.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground pt-10">
                <CalendarDays className="w-12 h-12 mb-4" />
                <p>No absences or public holidays on this day.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


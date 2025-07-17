import { Suspense } from 'react';
import Header from '@/components/layout/header';
import CurrentStatus from '@/components/dashboard/current-status';
import TeamCalendar from '@/components/dashboard/team-calendar';
import AbsencesTable from '@/components/dashboard/absences-table';
import CurrentStatusSkeleton from '@/components/dashboard/loading/current-status-skeleton';
import TeamCalendarSkeleton from '@/components/dashboard/loading/team-calendar-skeleton';
import AbsencesTableSkeleton from '@/components/dashboard/loading/absences-table-skeleton';
import { getUsers, getHolidayRequests, getPublicHolidays } from './actions';

export default function Home() {
  const usersPromise = getUsers();
  const holidayRequestsPromise = getHolidayRequests();
  const publicHolidaysPromise = getPublicHolidays();

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Suspense fallback={<TeamCalendarSkeleton />}>
              <TeamCalendar 
                usersPromise={usersPromise} 
                holidayRequestsPromise={holidayRequestsPromise} 
                publicHolidaysPromise={publicHolidaysPromise}
              />
            </Suspense>
          </div>
          <div className="space-y-8">
            <Suspense fallback={<CurrentStatusSkeleton />}>
              <CurrentStatus 
                usersPromise={usersPromise} 
                holidayRequestsPromise={holidayRequestsPromise} 
              />
            </Suspense>
            <Suspense fallback={<AbsencesTableSkeleton />}>
              <AbsencesTable 
                usersPromise={usersPromise} 
                holidayRequestsPromise={holidayRequestsPromise} 
              />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}

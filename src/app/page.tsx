import Header from '@/components/layout/header';
import CurrentStatus from '@/components/dashboard/current-status';
import TeamCalendar from '@/components/dashboard/team-calendar';
import AbsencesTable from '@/components/dashboard/absences-table';
import { getUsers, getHolidayRequests } from './actions';

export default async function Home() {
  const [usersResult, holidayRequestsResult] = await Promise.all([
    getUsers(),
    getHolidayRequests(),
  ]);

  if (!usersResult.success || !holidayRequestsResult.success) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header />
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          <div className="text-center text-red-500">
            <h2 className="text-2xl font-bold mb-4">Error Loading Data</h2>
            <p>
              {!usersResult.success && usersResult.error}
              {!holidayRequestsResult.success && holidayRequestsResult.error}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const users = usersResult.data || [];
  const holidayRequests = holidayRequestsResult.data || [];

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <TeamCalendar users={users} holidayRequests={holidayRequests} />
          </div>
          <div className="space-y-8">
            <CurrentStatus users={users} holidayRequests={holidayRequests} />
            <AbsencesTable users={users} holidayRequests={holidayRequests} />
          </div>
        </div>
      </main>
    </div>
  );
}

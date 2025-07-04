import { Suspense } from 'react';
import Header from '@/components/layout/header';
import PtoBalance from '@/components/my-time-off/pto-balance';
import MyRequestsTableWrapper from '@/components/my-time-off/my-requests-table-wrapper';
import PersonalCalendar from '@/components/my-time-off/personal-calendar';
import PtoBalanceSkeleton from '@/components/my-time-off/loading/pto-balance-skeleton';
import MyRequestsTableSkeleton from '@/components/my-time-off/loading/my-requests-table-skeleton';
import PersonalCalendarSkeleton from '@/components/my-time-off/loading/personal-calendar-skeleton';
import { getUserHolidayRequests, getCurrentUserProfile } from './actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';

export default function MyTimeOffPage() {
  const userRequestsPromise = getUserHolidayRequests();
  const userProfilePromise = getCurrentUserProfile();

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-primary p-2 rounded-lg">
                <User className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-3xl font-bold font-headline text-gray-800">
                My Time Off
              </h1>
            </div>
            <p className="text-muted-foreground">
              Manage your time off requests and view your PTO balance
            </p>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Personal Calendar */}
              <Suspense fallback={<PersonalCalendarSkeleton />}>
                <PersonalCalendar 
                  userRequestsPromise={userRequestsPromise}
                  userProfilePromise={userProfilePromise}
                />
              </Suspense>

              {/* My Requests Table */}
              <Suspense fallback={<MyRequestsTableSkeleton />}>
                <MyRequestsTableWrapper 
                  userRequestsPromise={userRequestsPromise}
                />
              </Suspense>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-8">
              {/* PTO Balance */}
              <Suspense fallback={<PtoBalanceSkeleton />}>
                <PtoBalance 
                  userRequestsPromise={userRequestsPromise}
                  userProfilePromise={userProfilePromise}
                />
              </Suspense>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
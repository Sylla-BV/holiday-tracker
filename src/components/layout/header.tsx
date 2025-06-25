'use client';

import { PlaneTakeoff } from 'lucide-react';
import { HolidayRequestDialog } from '@/components/holiday-request-dialog';
import UserMenu from '@/components/auth/user-menu';
import { useSession } from 'next-auth/react';

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="flex h-20 items-center justify-between border-b bg-card px-4 sm:px-6 md:px-8 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-2 rounded-lg">
          <PlaneTakeoff className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold font-headline text-gray-800">
          Sylla Vacations
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        {session && <HolidayRequestDialog />}
        <UserMenu />
      </div>
    </header>
  );
}

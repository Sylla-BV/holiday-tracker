'use client';

import { PlaneTakeoff, Calendar } from 'lucide-react';
import { HolidayRequestDialog } from '@/components/holiday-request-dialog';
import UserMenu from '@/components/auth/user-menu';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="flex h-20 items-center justify-between border-b bg-card px-4 sm:px-6 md:px-8 shadow-sm">
      <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <div className="bg-primary p-2 rounded-lg">
          <Image src="/logo.svg" alt="Sylla Vacations" width={32} height={32} />
        </div>
        <h1 className="text-2xl font-bold font-headline text-gray-800">
          Who's Away at Sylla?
        </h1>
      </Link>
      
      <div className="flex items-center gap-4">
        {session && (
          <>
            <Button asChild variant="outline" className="hidden sm:flex">
              <Link href="/my-time-off" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                My Time Off
              </Link>
            </Button>
            <HolidayRequestDialog />
          </>
        )}
        <UserMenu />
      </div>
    </header>
  );
}

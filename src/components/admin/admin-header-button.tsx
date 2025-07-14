'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Shield } from 'lucide-react';
import Link from 'next/link';

export default function AdminHeaderButton() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Only show for admin users
  if (!session?.user?.id || session.user.role !== 'admin') {
    return null;
  }

  const handleAdminClick = () => {
    startTransition(() => {
      router.push('/admin');
    });
  };

  return (
    <Button 
      asChild 
      variant="outline" 
      className="hidden sm:flex bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-300"
      disabled={isPending}
    >
      <Link href="/admin" className="flex items-center gap-2">
        <Shield className="h-4 w-4" />
        {isPending ? 'Loading...' : 'Admin'}
      </Link>
    </Button>
  );
}
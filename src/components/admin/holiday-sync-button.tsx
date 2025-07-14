'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { syncPublicHolidays } from '@/app/actions';
import { RefreshCw } from 'lucide-react';

interface HolidaySyncButtonProps {
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary';
  className?: string;
}

export function HolidaySyncButton({ 
  size = 'default', 
  variant = 'default', 
  className = '' 
}: HolidaySyncButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleSync = () => {
    startTransition(async () => {
      try {
        const result = await syncPublicHolidays();
        
        if (result.success) {
          toast.success(result.message || 'Public holidays synced successfully');
        } else {
          toast.error(result.error || 'Failed to sync public holidays');
        }
      } catch (error) {
        console.error('Error syncing holidays:', error);
        toast.error('An unexpected error occurred while syncing holidays');
      }
    });
  };

  return (
    <Button
      size={size}
      variant={variant}
      disabled={isPending}
      onClick={handleSync}
      className={`${className} ${isPending ? 'cursor-not-allowed' : ''}`}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Syncing...' : 'Sync Holidays'}
    </Button>
  );
}
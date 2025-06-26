'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { updateUserRole } from '@/app/actions';

interface UserRoleButtonProps {
  userId: string;
  currentRole: 'admin' | 'member';
}

export function UserRoleButton({ userId, currentRole }: UserRoleButtonProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleUpdateRole = () => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    
    startTransition(async () => {
      const result = await updateUserRole(userId, newRole);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: `User role updated to ${newRole}`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Failed to update user role',
        });
      }
    });
  };

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={handleUpdateRole}
    >
      {isPending ? 'Updating...' : 
       currentRole === 'admin' ? 'Remove Admin' : 'Make Admin'
      }
    </Button>
  );
}
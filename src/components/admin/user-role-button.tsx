'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { updateUserRole } from '@/app/actions';

interface UserRoleButtonProps {
  userId: string;
  currentRole: 'admin' | 'member';
}

export function UserRoleButton({ userId, currentRole }: UserRoleButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleUpdateRole = () => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    
    startTransition(async () => {
      const result = await updateUserRole(userId, newRole);
      
      if (result.success) {
        toast.success(`User role updated to ${newRole}`);
      } else {
        toast.error(result.error || 'Failed to update user role');
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
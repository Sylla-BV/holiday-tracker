'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { updateRequestStatus } from '@/app/actions';
import { Check, X } from 'lucide-react';

interface ApprovalButtonProps {
  requestId: string;
  action: 'approved' | 'rejected';
  variant?: 'default' | 'destructive';
}

export function ApprovalButton({ requestId, action, variant = 'default' }: ApprovalButtonProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleApproval = () => {
    startTransition(async () => {
      const result = await updateRequestStatus(requestId, action);
      
      if (result.success) {
        toast({
          title: 'Success',
          description: `Request ${action} successfully`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || `Failed to ${action} request`,
        });
      }
    });
  };

  return (
    <Button
      size="sm"
      variant={variant}
      disabled={isPending}
      onClick={handleApproval}
    >
      {isPending ? (
        'Processing...'
      ) : action === 'approved' ? (
        <>
          <Check className="h-3 w-3 mr-1" />
          Approve
        </>
      ) : (
        <>
          <X className="h-3 w-3 mr-1" />
          Reject
        </>
      )}
    </Button>
  );
}
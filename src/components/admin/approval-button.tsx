'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { updateRequestStatus } from '@/app/actions';
import { Check, X } from 'lucide-react';

interface ApprovalButtonProps {
  requestId: string;
  action: 'approved' | 'rejected';
  variant?: 'default' | 'destructive';
}

export function ApprovalButton({ requestId, action, variant = 'default' }: ApprovalButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleApproval = () => {
    startTransition(async () => {
      const result = await updateRequestStatus(requestId, action);
      
      if (result.success) {
        toast.success(`Request ${action} successfully`);
      } else {
        toast.error(result.error || `Failed to ${action} request`);
      }
    });
  };

  return (
    <Button
      size="sm"
      className={action === 'approved' ? "bg-green-500 text-white hover:bg-green-600" : ""}
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
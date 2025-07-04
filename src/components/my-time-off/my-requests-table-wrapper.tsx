'use client';

import { useState } from 'react';
import MyRequestsTable from './my-requests-table';
import { cancelHolidayRequest } from '@/app/actions';
import type { TransformedHolidayRequest } from '@/lib/schema';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface MyRequestsTableWrapperProps {
  userRequestsPromise: Promise<{ success: boolean; data?: TransformedHolidayRequest[]; error?: string }>;
}

export default function MyRequestsTableWrapper({ userRequestsPromise }: MyRequestsTableWrapperProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCancelRequest = async (request: TransformedHolidayRequest) => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      const result = await cancelHolidayRequest(request.id);
      
      if (result.success) {
        toast.success('Request Cancelled', {
          description: 'Your time off request has been successfully cancelled.',
        });
        
        // Refresh the page to show updated data
        router.refresh();
      } else {
        toast.error('Cancellation Failed', {
          description: result.error || 'Failed to cancel your request. Please try again.',
        });
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error('Cancellation Failed', {
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditRequest = (request: TransformedHolidayRequest) => {
    // TODO: Implement edit functionality
    toast.info('Edit Functionality', {
      description: 'Edit functionality will be implemented in a future update.',
    });
  };

  return (
    <MyRequestsTable
      userRequestsPromise={userRequestsPromise}
      onCancelRequest={handleCancelRequest}
      onEditRequest={handleEditRequest}
    />
  );
}
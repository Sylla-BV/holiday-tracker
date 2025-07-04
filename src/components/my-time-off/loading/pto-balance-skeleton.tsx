import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays } from 'lucide-react';

export default function PtoBalanceSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          PTO Balance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Balance Overview */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Used / Total</span>
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-2 w-full" />
          <div className="text-center">
            <Skeleton className="h-8 w-8 mx-auto mb-1" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Skeleton className="h-4 w-16 mx-auto mb-1" />
            <Skeleton className="h-6 w-8 mx-auto" />
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Skeleton className="h-4 w-16 mx-auto mb-1" />
            <Skeleton className="h-6 w-8 mx-auto" />
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <Skeleton className="h-6 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}
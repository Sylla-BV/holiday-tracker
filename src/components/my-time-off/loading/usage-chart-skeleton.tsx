import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';

export default function UsageChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Usage Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Year Summary */}
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <Skeleton className="h-8 w-8 mx-auto mb-1" />
          <Skeleton className="h-4 w-20 mx-auto" />
        </div>

        {/* Leave Type Breakdown */}
        <div>
          <Skeleton className="h-5 w-24 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16" />
                </div>
                <div className="text-right">
                  <Skeleton className="h-4 w-12 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Skeleton className="h-6 w-6 mx-auto mb-1" />
            <Skeleton className="h-4 w-16 mx-auto" />
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Skeleton className="h-6 w-6 mx-auto mb-1" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
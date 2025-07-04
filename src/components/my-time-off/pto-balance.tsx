import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { getUserPtoStats } from '@/app/my-time-off/actions';

interface PtoBalanceProps {
  userRequestsPromise: Promise<any>;
  userProfilePromise: Promise<any>;
}

export default async function PtoBalance({ userRequestsPromise, userProfilePromise }: PtoBalanceProps) {
  const ptoStatsResult = await getUserPtoStats();
  
  if (!ptoStatsResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            PTO Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <p>Unable to load PTO balance</p>
            <p className="text-sm">{ptoStatsResult.error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { totalAllocation, usedDays, remainingDays, approvedRequests, pendingRequests, currentYear } = ptoStatsResult.data!;
  const usagePercentage = (usedDays / totalAllocation) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          PTO Balance {currentYear}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Balance Overview */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Used / Total</span>
            <span className="font-medium">{usedDays} / {totalAllocation} days</span>
          </div>
          <Progress value={usagePercentage} className="h-2" />
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{remainingDays}</div>
            <div className="text-sm text-muted-foreground">days remaining</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Approved</span>
            </div>
            <div className="text-xl font-bold">{approvedRequests}</div>
          </div>
          <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-orange-600 dark:text-orange-400 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <div className="text-xl font-bold">{pendingRequests}</div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          {remainingDays > 10 ? (
            <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              Good balance
            </Badge>
          ) : remainingDays > 5 ? (
            <Badge variant="default" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
              Consider planning time off
            </Badge>
          ) : (
            <Badge variant="default" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
              Low balance
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
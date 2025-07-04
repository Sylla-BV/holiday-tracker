import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';

interface UsageChartProps {
  userRequestsPromise: Promise<any>;
  userProfilePromise: Promise<any>;
}

export default async function UsageChart({ userRequestsPromise, userProfilePromise }: UsageChartProps) {
  const requestsResult = await userRequestsPromise;
  
  if (!requestsResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Usage Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <p>Unable to load statistics</p>
            <p className="text-sm">{requestsResult.error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const requests = requestsResult.data || [];
  const currentYear = new Date().getFullYear();
  
  // Filter requests for current year and only vacation requests (exclude sick leave and public holidays)
  const currentYearVacationRequests = requests.filter((request: any) => {
    const startDate = new Date(request.startDate);
    return startDate.getFullYear() === currentYear && request.leaveType === 'annual';
  });

  // Helper function to calculate weekdays only
  const calculateWeekdays = (startDate: Date, endDate: Date): number => {
    let weekdaysCount = 0;
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      // 0 = Sunday, 6 = Saturday, so we want 1-5 (Monday-Friday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        weekdaysCount++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return weekdaysCount;
  };

  // Group vacation requests by type (only showing Vacation since we filtered)
  const leaveTypeStats = currentYearVacationRequests.reduce((acc: any, request: any) => {
    const type = request.type;
    if (!acc[type]) {
      acc[type] = { count: 0, days: 0 };
    }
    acc[type].count++;
    const weekdays = calculateWeekdays(new Date(request.startDate), new Date(request.endDate));
    acc[type].days += weekdays;
    return acc;
  }, {});

  // Group by month for trending (vacation requests only)
  const monthlyStats = currentYearVacationRequests.reduce((acc: any, request: any) => {
    const month = new Date(request.startDate).getMonth();
    if (!acc[month]) {
      acc[month] = { count: 0, days: 0 };
    }
    acc[month].count++;
    const weekdays = calculateWeekdays(new Date(request.startDate), new Date(request.endDate));
    acc[month].days += weekdays;
    return acc;
  }, {});

  // Calculate total days used
  const totalDaysUsed = Object.values(leaveTypeStats).reduce((total: number, stat: any) => total + stat.days, 0);

  // Get most active month
  const mostActiveMonth = Object.entries(monthlyStats).reduce((max: any, [month, stats]: any) => {
    return stats.days > (max.days || 0) ? { month: parseInt(month), days: stats.days } : max;
  }, { month: -1, days: 0 });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  function getTypeColor(type: string) {
    switch (type.toLowerCase()) {
      case 'vacation':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'sick leave':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'personal':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'maternity leave':
      case 'paternity leave':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }

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
          <div className="text-2xl font-bold text-primary">{totalDaysUsed}</div>
          <div className="text-sm text-muted-foreground">vacation weekdays used in {currentYear}</div>
        </div>

        {/* Leave Type Breakdown */}
        {Object.keys(leaveTypeStats).length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              By Leave Type
            </h3>
            <div className="space-y-2">
              {Object.entries(leaveTypeStats).map(([type, stats]: any) => (
                <div key={type} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getTypeColor(type)}>
                      {type}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{stats.days} weekdays</div>
                    <div className="text-sm text-muted-foreground">{stats.count} requests</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Monthly Insights */}
        {mostActiveMonth.month !== -1 && (
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Insights
            </h3>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-sm">
                <strong>Most active month:</strong> {monthNames[mostActiveMonth.month]} with {mostActiveMonth.days} vacation weekdays off
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold">{currentYearVacationRequests.length}</div>
            <div className="text-sm text-muted-foreground">Vacation requests</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-lg font-bold">
              {currentYearVacationRequests.length > 0 ? Math.round(totalDaysUsed / currentYearVacationRequests.length) : 0}
            </div>
            <div className="text-sm text-muted-foreground">Avg weekdays per request</div>
          </div>
        </div>

        {/* Empty State */}
        {currentYearVacationRequests.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No vacation data for {currentYear}</p>
            <p className="text-sm">Vacation statistics will appear when you take time off</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
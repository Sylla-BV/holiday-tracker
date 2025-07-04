import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin } from 'lucide-react';

interface PersonalCalendarProps {
  userRequestsPromise: Promise<any>;
  userProfilePromise: Promise<any>;
}

export default async function PersonalCalendar({ userRequestsPromise, userProfilePromise }: PersonalCalendarProps) {
  const requestsResult = await userRequestsPromise;
  
  if (!requestsResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Personal Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            <p>Unable to load calendar</p>
            <p className="text-sm">{requestsResult.error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const requests = requestsResult.data || [];
  const approvedRequests = requests.filter((request: any) => request.dbStatus === 'approved');
  
  // Get current and upcoming time off (next 90 days)
  const today = new Date();
  const nextThreeMonths = new Date();
  nextThreeMonths.setDate(today.getDate() + 90);
  
  const upcomingTimeOff = approvedRequests.filter((request: any) => {
    const startDate = new Date(request.startDate);
    return startDate >= today && startDate <= nextThreeMonths;
  }).sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  // Get current time off (happening now)
  const currentTimeOff = approvedRequests.filter((request: any) => {
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    return startDate <= today && endDate >= today;
  });

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatDateRange(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.getTime() === end.getTime()) {
      return formatDate(startDate);
    }
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  }

  function calculateDays(startDate: string, endDate: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return daysDiff;
  }

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
          <Calendar className="h-5 w-5" />
          Personal Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Time Off */}
        {currentTimeOff.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-green-600" />
              Currently Off
            </h3>
            <div className="space-y-2">
              {currentTimeOff.map((request: any) => (
                <div key={request.id} className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{request.type}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDateRange(request.startDate, request.endDate)}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {calculateDays(request.startDate, request.endDate)} days
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Time Off */}
        <div>
          <h3 className="font-semibold mb-3">Upcoming Time Off</h3>
          {upcomingTimeOff.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No upcoming time off scheduled</p>
              <p className="text-sm">Your approved time off will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingTimeOff.map((request: any) => (
                <div key={request.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className={getTypeColor(request.type)}>
                          {request.type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {calculateDays(request.startDate, request.endDate)} days
                        </span>
                      </div>
                      <div className="font-medium">
                        {formatDateRange(request.startDate, request.endDate)}
                      </div>
                      {request.notes && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {request.notes}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {Math.ceil((new Date(request.startDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} days away
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
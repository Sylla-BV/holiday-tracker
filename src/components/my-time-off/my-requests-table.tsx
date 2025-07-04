/**
 * MyRequestsTable - A comprehensive table component for displaying user's personal time off requests
 * 
 * Features:
 * - Displays user's holiday requests in a sortable table format
 * - Filter by status (pending, approved, rejected)
 * - Sort by date, type, and status
 * - Action buttons for editing/canceling pending requests
 * - Responsive design for mobile devices
 * - Empty state handling
 * - Status badges with appropriate colors
 * - Integrates with existing data fetching patterns using React's use() hook
 */

'use client';

import { use, useState, useMemo } from 'react';
import { format, isFuture, isPast, isToday, parseISO } from 'date-fns';
import { MoreHorizontal, Edit, X, ArrowUpDown, ArrowUp, ArrowDown, Calendar, Clock, User } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TransformedHolidayRequest } from '@/lib/schema';

type SortField = 'startDate' | 'type' | 'status' | 'createdAt';
type SortDirection = 'asc' | 'desc';
type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

interface MyRequestsTableProps {
  userRequestsPromise: Promise<{ success: boolean; data?: TransformedHolidayRequest[]; error?: string }>;
  onEditRequest?: (request: TransformedHolidayRequest) => void;
  onCancelRequest?: (request: TransformedHolidayRequest) => void;
}

export default function MyRequestsTable({
  userRequestsPromise,
  onEditRequest,
  onCancelRequest,
}: MyRequestsTableProps) {
  const [sortField, setSortField] = useState<SortField>('startDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  
  const userRequestsResult = use(userRequestsPromise);

  // Handle error state
  if (!userRequestsResult.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Time Off Requests</CardTitle>
          <CardDescription>Your holiday and leave requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500 p-8">
            <h3 className="text-lg font-semibold mb-2">Error Loading Requests</h3>
            <p className="text-sm">{userRequestsResult.error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const userRequests = userRequestsResult.data || [];

  // Apply status filter and sorting
  const filteredAndSortedRequests = useMemo(() => {
    let filtered = userRequests;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.dbStatus === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'startDate':
          aValue = new Date(a.startDate);
          bValue = new Date(b.startDate);
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'createdAt':
          // Note: createdAt is not in the current schema, using startDate as fallback
          aValue = new Date(a.startDate);
          bValue = new Date(b.startDate);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [userRequests, statusFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string, dbStatus: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
    };

    return (
      <Badge 
        variant="outline" 
        className={variants[dbStatus as keyof typeof variants] || 'bg-gray-100 text-gray-800 border-gray-200'}
      >
        {status}
      </Badge>
    );
  };

  const canEditOrCancel = (request: TransformedHolidayRequest) => {
    // Can edit/cancel if the request is not rejected and hasn't started yet
    const isNotRejected = request.dbStatus !== 'rejected';
    const isUpcoming = isFuture(parseISO(request.startDate)) || isToday(parseISO(request.startDate));
    return isNotRejected && isUpcoming;
  };

  const canEdit = (request: TransformedHolidayRequest) => {
    // Can only edit pending requests that haven't started
    const isPending = request.dbStatus === 'pending';
    const isUpcoming = isFuture(parseISO(request.startDate)) || isToday(parseISO(request.startDate));
    return isPending && isUpcoming;
  };

  const canCancel = (request: TransformedHolidayRequest) => {
    // Can cancel pending or approved requests that haven't started yet
    const isNotRejected = request.dbStatus !== 'rejected';
    const isUpcoming = isFuture(parseISO(request.startDate)) || isToday(parseISO(request.startDate));
    return isNotRejected && isUpcoming;
  };

  const getDateDisplay = (startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    
    if (format(start, 'yyyy-MM-dd') === format(end, 'yyyy-MM-dd')) {
      return format(start, 'MMM d, yyyy');
    }
    
    if (format(start, 'yyyy') === format(end, 'yyyy')) {
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    }
    
    return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
  };

  const getStatusCounts = () => {
    const counts = {
      all: userRequests.length,
      pending: userRequests.filter(r => r.dbStatus === 'pending').length,
      approved: userRequests.filter(r => r.dbStatus === 'approved').length,
      rejected: userRequests.filter(r => r.dbStatus === 'rejected').length,
    };
    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Time Off Requests</CardTitle>
        <CardDescription>
          Your holiday and leave requests ({statusCounts.all} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests ({statusCounts.all})</SelectItem>
                <SelectItem value="pending">Pending ({statusCounts.pending})</SelectItem>
                <SelectItem value="approved">Approved ({statusCounts.approved})</SelectItem>
                <SelectItem value="rejected">Rejected ({statusCounts.rejected})</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {filteredAndSortedRequests.length} of {statusCounts.all} requests
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('startDate')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Dates
                    {getSortIcon('startDate')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('type')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Type
                    {getSortIcon('type')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleSort('status')}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Status
                    {getSortIcon('status')}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedRequests.length > 0 ? (
                filteredAndSortedRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{getDateDisplay(request.startDate, request.endDate)}</span>
                        <span className="text-sm text-muted-foreground">
                          {isPast(parseISO(request.endDate)) ? (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Past
                            </span>
                          ) : isToday(parseISO(request.startDate)) ? (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              Today
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Upcoming
                            </span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{request.type}</TableCell>
                    <TableCell>
                      {getStatusBadge(request.status, request.dbStatus)}
                    </TableCell>
                    <TableCell className="text-right">
                      {canEditOrCancel(request) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onEditRequest && canEdit(request) && (
                              <DropdownMenuItem onClick={() => onEditRequest(request)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Request
                              </DropdownMenuItem>
                            )}
                            {onCancelRequest && canCancel(request) && (
                              <>
                                {onEditRequest && canEdit(request) && <DropdownMenuSeparator />}
                                <DropdownMenuItem 
                                  onClick={() => onCancelRequest(request)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Cancel Request
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {request.dbStatus === 'pending' ? 'Past deadline' : 'No actions'}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                      <div className="text-sm text-muted-foreground">
                        {statusFilter === 'all' ? 'No time off requests found.' : `No ${statusFilter} requests found.`}
                      </div>
                      {statusFilter !== 'all' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setStatusFilter('all')}
                          className="text-sm text-muted-foreground hover:text-foreground"
                        >
                          Show all requests
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
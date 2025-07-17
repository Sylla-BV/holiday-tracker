'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HolidaySyncButton } from './holiday-sync-button';
import { Calendar, MapPin, Settings, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { getPublicHolidays } from '@/app/actions';

interface HolidaysSummary {
  totalHolidays: number;
  countriesTracked: string[];
  currentYearHolidays: number;
  nextYearHolidays: number;
  lastSyncDate?: string;
}

export function HolidaysManagementCard() {
  const [summary, setSummary] = useState<HolidaysSummary>({
    totalHolidays: 0,
    countriesTracked: [],
    currentYearHolidays: 0,
    nextYearHolidays: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHolidaysSummary();
  }, []);

  const loadHolidaysSummary = async () => {
    try {
      const result = await getPublicHolidays();
      
      if (result.success && result.data) {
        const holidays = result.data;
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;
        
        const countriesSet = new Set(holidays.map(h => h.country));
        const currentYearCount = holidays.filter(h => h.year === currentYear).length;
        const nextYearCount = holidays.filter(h => h.year === nextYear).length;
        
        setSummary({
          totalHolidays: holidays.length,
          countriesTracked: Array.from(countriesSet),
          currentYearHolidays: currentYearCount,
          nextYearHolidays: nextYearCount,
          lastSyncDate: holidays.length > 0 ? 'Recently synced' : undefined,
        });
      }
    } catch (error) {
      console.error('Error loading holidays summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncComplete = () => {
    // Refresh the summary after sync
    loadHolidaysSummary();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Public Holidays Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Public Holidays Management
        </CardTitle>
        <CardDescription>
          Manage and sync public holidays for your team's countries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">{summary.totalHolidays}</div>
            <div className="text-sm text-blue-600">Total Holidays</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-700">{summary.countriesTracked.length}</div>
            <div className="text-sm text-green-600">Countries Tracked</div>
          </div>
        </div>

        {/* Countries Tracked */}
        {summary.countriesTracked.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Countries Tracked
            </h4>
            <div className="flex flex-wrap gap-2">
              {summary.countriesTracked.map(country => (
                <Badge key={country} variant="outline" className="text-xs">
                  {country}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Year Breakdown */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">Holiday Coverage</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>{new Date().getFullYear()} holidays:</span>
              <span className="font-medium">{summary.currentYearHolidays}</span>
            </div>
            <div className="flex justify-between">
              <span>{new Date().getFullYear() + 1} holidays:</span>
              <span className="font-medium">{summary.nextYearHolidays}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <div onClick={handleSyncComplete}>
            <HolidaySyncButton 
              size="sm" 
              className="w-full"
            />
          </div>
          
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/holidays" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Manage Holidays
              <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        </div>

        {/* Last Sync Info */}
        {summary.lastSyncDate && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            {summary.lastSyncDate}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
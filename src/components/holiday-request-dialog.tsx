'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Loader2, Forward, AlertTriangle } from 'lucide-react';
// Temporarily disabled AI suggestion icons
// import { Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, format } from 'date-fns';
import { toast } from 'sonner';
import { handleRequestTimeOff, checkHolidayConflicts, checkPublicHolidayConflicts } from '@/app/actions';
// Temporarily disabled AI suggestions
// import type { SuggestAlternativeDatesOutput } from '@/ai/flows/suggest-alternative-dates';

const formSchema = z.object({
  startDate: z.date({ required_error: 'A start date is required.' }),
  endDate: z.date({ required_error: 'An end date is required.' }),
  leaveType: z.string({ required_error: 'Please select a leave type.' }),
  notes: z.string().optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date must be after or equal to start date",
  path: ["endDate"],
});

type ConflictData = {
  id: string;
  startDate: string;
  endDate: string;
  userName: string;
};

type PublicHolidayData = {
  id: string;
  date: string;
  name: string;
  localName: string | null;
  country: string;
  type: string;
};

export function HolidayRequestDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);
  const [publicHolidays, setPublicHolidays] = useState<PublicHolidayData[]>([]);
  const [showConflicts, setShowConflicts] = useState(false);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  // Temporarily disabled AI suggestions
  // const [aiSuggestions, setAiSuggestions] = useState<SuggestAlternativeDatesOutput | null>(null);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startDate: new Date(),
      endDate: addDays(new Date(), 4),
    },
  });
  
  const { startDate } = form.watch();

  async function checkForConflicts(values: z.infer<typeof formSchema>) {
    console.log('Checking for conflicts with values:', values);
    setIsCheckingConflicts(true);
    
    // Format dates to YYYY-MM-DD string without timezone conversion
    const formatDateToString = (date: Date) => {
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.error('Invalid date provided to checkForConflicts:', date);
        throw new Error('Invalid date provided');
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    try {
      const conflictData = {
        startDate: formatDateToString(values.startDate),
        endDate: formatDateToString(values.endDate),
      };
      console.log('Calling checkHolidayConflicts with:', conflictData);
      
      // Check for team member conflicts
      const conflictResult = await checkHolidayConflicts(conflictData);
      console.log('Conflict check result:', conflictResult);
      
      // Check for public holiday conflicts
      const publicHolidayResult = await checkPublicHolidayConflicts(conflictData);
      console.log('Public holiday check result:', publicHolidayResult);
      
      let hasConflicts = false;
      
      if (conflictResult.success && conflictResult.hasConflict && conflictResult.conflicts) {
        setConflicts(conflictResult.conflicts);
        hasConflicts = true;
      } else {
        setConflicts([]);
      }
      
      if (publicHolidayResult.success && publicHolidayResult.hasConflict && publicHolidayResult.publicHolidays) {
        setPublicHolidays(publicHolidayResult.publicHolidays);
        hasConflicts = true;
      } else {
        setPublicHolidays([]);
      }
      
      if (hasConflicts) {
        setShowConflicts(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking conflicts:', error);
      toast.error('Failed to check for conflicts', {
        description: 'An error occurred while checking for scheduling conflicts.'
      });
      return false;
    } finally {
      setIsCheckingConflicts(false);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log('Starting holiday request submission', { values });
    
    // If we haven't checked for conflicts yet, check first
    if (!showConflicts) {
      console.log('Checking for conflicts first...');
      const hasConflicts = await checkForConflicts(values);
      if (hasConflicts) {
        console.log('Conflicts found, showing conflict UI');
        return;
      }
    }
    
    // Proceed with submission
    setIsLoading(true);
    console.log('Proceeding with submission...');

    // Format dates to YYYY-MM-DD string without timezone conversion
    const formatDateToString = (date: Date) => {
      if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.error('Invalid date provided:', date);
        throw new Error('Invalid date provided');
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formatted = `${year}-${month}-${day}`;
      console.log(`Formatted date: ${date.toISOString()} -> ${formatted}`);
      return formatted;
    };

    const requestData = {
      startDate: formatDateToString(values.startDate),
      endDate: formatDateToString(values.endDate),
      leaveType: values.leaveType,
      notes: values.notes,
    };
    
    console.log('Calling handleRequestTimeOff with data:', requestData);
    
    try {
      const result = await handleRequestTimeOff(requestData);
      
      console.log('handleRequestTimeOff result:', result);
      
      setIsLoading(false);
      
      if (result.success) {
        console.log('Request successful, showing success toast');
        toast.success('Request Submitted!', {
          description: 'Your time off request has been successfully submitted.',
        });
        setOpen(false);
        form.reset();
        setShowConflicts(false);
        setConflicts([]);
        setPublicHolidays([]);
      } else {
        console.error('Request failed with error:', result.error);
        toast.error('An error occurred', {
          description: result.error || 'Failed to process your request.'
        });
      }
    } catch (error) {
      console.error('Unexpected error during submission:', error);
      setIsLoading(false);
      toast.error('Unexpected error', {
        description: 'An unexpected error occurred. Please check the console for details.'
      });
    }
  }
  
  // Temporarily disabled AI suggestions
  // const handleSelectSuggestion = (range: { start: string, end: string }) => {
  //   form.setValue('startDate', new Date(range.start));
  //   form.setValue('endDate', new Date(range.end));
  //   setAiSuggestions(null);
  // }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
            form.reset();
            setShowConflicts(false);
            setConflicts([]);
            setPublicHolidays([]);
            // Temporarily disabled AI suggestions
            // setAiSuggestions(null);
        }
    }}>
      <DialogTrigger asChild>
        <Button>Request Time Off</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Request Time Off</DialogTitle>
          <DialogDescription>
            Fill out the form below to request time off.
          </DialogDescription>
        </DialogHeader>
        
        {showConflicts && (conflicts.length > 0 || publicHolidays.length > 0) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h4 className="font-medium text-amber-800">Scheduling Conflicts Detected</h4>
            </div>
            
            {/* Team Member Conflicts */}
            {conflicts.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-amber-700 mb-3">
                  The following team members already have approved time off during your requested dates:
                </p>
                <div className="space-y-2 mb-3">
                  {conflicts.map((conflict) => (
                    <div key={conflict.id} className="flex items-center justify-between bg-white rounded p-2 text-sm">
                      <span className="font-medium">{conflict.userName}</span>
                      <span className="text-gray-600">
                        {format(new Date(conflict.startDate), 'MMM d')} - {format(new Date(conflict.endDate), 'MMM d')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Public Holiday Conflicts */}
            {publicHolidays.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-amber-700 mb-3">
                  The following public holidays occur during your requested dates:
                </p>
                <div className="space-y-2 mb-3">
                  {publicHolidays.map((holiday) => (
                    <div key={holiday.id} className="flex items-center justify-between bg-white rounded p-2 text-sm">
                      <div>
                        <span className="font-medium">{holiday.name}</span>
                        {holiday.localName && holiday.localName !== holiday.name && (
                          <span className="text-gray-600 ml-2">({holiday.localName})</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-gray-600">{format(new Date(holiday.date), 'MMM d')}</span>
                        <span className="text-xs text-gray-500 block">{holiday.country} • {holiday.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-sm text-amber-700 mb-3">
              You can still submit this request, but please confirm you want to proceed despite the conflicts.
            </p>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setShowConflicts(false);
                setConflicts([]);
                setPublicHolidays([]);
              }}
            >
              Choose Different Dates
            </Button>
          </div>
        )}
        
        {/* Temporarily disabled AI suggestions UI */}
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover open={startDateOpen} onOpenChange={setStartDateOpen} modal={true}>
                        <PopoverTrigger asChild>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                            onClick={(e) => {
                              e.preventDefault();
                              setStartDateOpen(!startDateOpen);
                            }}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, 'LLL dd, y')
                            ) : (
                              <span>Pick start date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent 
                          className="w-auto p-0" 
                          align="start"
                          onCloseAutoFocus={(e) => e.preventDefault()}
                        >
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(date);
                                form.setValue('endDate', date);
                                setStartDateOpen(false);
                              }
                            }}
                            disabled={(date) =>
                              date < new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            defaultMonth={field.value}
                            fixedWeeks
                            key={`start-calendar-${field.value?.toISOString() || 'none'}`}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <Popover open={endDateOpen} onOpenChange={setEndDateOpen} modal={true}>
                        <PopoverTrigger asChild>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                            onClick={(e) => {
                              e.preventDefault();
                              setEndDateOpen(!endDateOpen);
                            }}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, 'LLL dd, y')
                            ) : (
                              <span>Pick end date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent 
                          className="w-auto p-0" 
                          align="start"
                          onCloseAutoFocus={(e) => e.preventDefault()}
                        >
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(date);
                                setEndDateOpen(false);
                              }
                            }}
                            disabled={(date) =>
                              date < (startDate || new Date()) || date < new Date("1900-01-01")
                            }
                            initialFocus
                            defaultMonth={field.value}
                            fixedWeeks
                            key={`end-calendar-${field.value?.toISOString() || 'none'}-${startDate?.toISOString() || 'none'}`}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="leaveType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leave Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type of leave" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Vacation">Vacation</SelectItem>
                        <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                        <SelectItem value="Personal">Personal Day</SelectItem>
                        <SelectItem value="Public Holiday">Public Holiday</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add any relevant notes for your manager." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="ghost">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isLoading || isCheckingConflicts}>
                  {isCheckingConflicts ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking conflicts...
                    </>
                  ) : isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : showConflicts ? (
                    <>
                      Confirm Request <Forward className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Check & Submit <Forward className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
      </DialogContent>
    </Dialog>
  );
}

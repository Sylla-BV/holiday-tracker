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
import { CalendarIcon, Loader2, Wand2, Forward, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addDays, format } from 'date-fns';
import { toast } from 'sonner';
import { handleRequestTimeOff } from '@/app/actions';
import type { SuggestAlternativeDatesOutput } from '@/ai/flows/suggest-alternative-dates';

const formSchema = z.object({
  startDate: z.date({ required_error: 'A start date is required.' }),
  endDate: z.date({ required_error: 'An end date is required.' }),
  leaveType: z.string({ required_error: 'Please select a leave type.' }),
  notes: z.string().optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date must be after or equal to start date",
  path: ["endDate"],
});

export function HolidayRequestDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<SuggestAlternativeDatesOutput | null>(null);
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setAiSuggestions(null);

    const result = await handleRequestTimeOff(values);

    setIsLoading(false);
    
    if (result.success) {
      toast.success('Request Submitted!', {
        description: 'Your time off request has been successfully submitted.',
      });
      setOpen(false);
      form.reset();
    } else if (result.suggestions) {
      setAiSuggestions(result.suggestions);
    } else {
      toast.error('An error occurred', {
        description: result.error || 'Failed to process your request.'
      });
    }
  }
  
  const handleSelectSuggestion = (range: { start: string, end: string }) => {
    form.setValue('startDate', new Date(range.start));
    form.setValue('endDate', new Date(range.end));
    setAiSuggestions(null);
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
            form.reset();
            setAiSuggestions(null);
        }
    }}>
      <DialogTrigger asChild>
        <Button>Request Time Off</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Request Time Off</DialogTitle>
          <DialogDescription>
            {aiSuggestions ? 'There is a conflict with your request. Here are some AI-powered suggestions.' : 'Fill out the form below to request time off.'}
          </DialogDescription>
        </DialogHeader>
        {aiSuggestions ? (
             <div className="space-y-4 py-4">
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-500 mt-1" />
                        <div>
                            <h4 className="font-semibold text-yellow-800">Scheduling Conflict</h4>
                            <p className="text-sm text-yellow-700">{aiSuggestions.reasoning}</p>
                        </div>
                    </div>
                </div>
                
                <h3 className="font-semibold flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary" /> Alternative Dates</h3>
                <div className="space-y-2">
                    {aiSuggestions.alternativeDates.map((range, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                            <p className="font-medium">{format(new Date(range.start), 'MMM d')} - {format(new Date(range.end), 'MMM d, yyyy')}</p>
                            <Button size="sm" variant="outline" onClick={() => handleSelectSuggestion(range)}>Select</Button>
                        </div>
                    ))}
                </div>
                <Button variant="ghost" onClick={() => setAiSuggestions(null)} className="w-full">
                    Ignore and proceed with original dates
                </Button>
            </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, 'LLL dd, y')
                            ) : (
                              <span>Pick start date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
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
                      <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(field.value, 'LLL dd, y')
                            ) : (
                              <span>Pick end date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
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
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      Submit Request <Forward className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

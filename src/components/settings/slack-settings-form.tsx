'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { updateUserSlackSettings } from '@/app/actions';
import { Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface SlackSettingsFormProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  userId: string;
  currentSlackPresenceUpdate: boolean;
  currentSlackEmail: string | null;
}

export default function SlackSettingsForm({ 
  user, 
  userId, 
  currentSlackPresenceUpdate, 
  currentSlackEmail 
}: SlackSettingsFormProps) {
  const [slackPresenceUpdate, setSlackPresenceUpdate] = useState(currentSlackPresenceUpdate);
  const [slackEmail, setSlackEmail] = useState(currentSlackEmail || '');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (slackPresenceUpdate && !slackEmail.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter your Slack email address to enable status updates.',
        variant: 'destructive',
      });
      return;
    }

    if (slackEmail && !slackEmail.includes('@')) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateUserSlackSettings(
          userId,
          slackPresenceUpdate,
          slackPresenceUpdate ? slackEmail : null
        );

        if (result.success) {
          toast({
            title: 'Settings Updated',
            description: 'Your Slack settings have been saved successfully.',
          });
          router.refresh();
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to update settings.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
        });
      }
    });
  };

  const handleSwitchChange = (checked: boolean) => {
    setSlackPresenceUpdate(checked);
    if (!checked) {
      setSlackEmail('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Slack Integration</CardTitle>
          <Badge variant="outline">Optional</Badge>
        </div>
        <CardDescription>
          Configure how your holiday status appears in Slack
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            When enabled, your Slack status will automatically update when you start or end holidays. 
            This helps keep your team informed about your availability.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="slack-presence-update" className="text-base">
                Update my Slack status
              </Label>
              <div className="text-sm text-muted-foreground">
                Automatically set your Slack status when you&apos;re on holiday
              </div>
            </div>
            <Switch
              id="slack-presence-update"
              checked={slackPresenceUpdate}
              onCheckedChange={handleSwitchChange}
            />
          </div>

          {slackPresenceUpdate && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="slack-email">
                  Slack Account Email
                </Label>
                <Input
                  id="slack-email"
                  type="email"
                  placeholder="your.slack@company.com"
                  value={slackEmail}
                  onChange={(e) => setSlackEmail(e.target.value)}
                  required={slackPresenceUpdate}
                />
                <p className="text-sm text-muted-foreground">
                  Enter the email address associated with your Slack account. This is used to identify your Slack profile.
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>What happens when this is enabled:</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Your Slack status will show when you&apos;re on holiday (e.g., &quot;On vacation until Jul 15 🏖️&quot;)</li>
                    <li>• Your presence will be set to &quot;away&quot; during your time off</li>
                    <li>• Status will be automatically cleared when you return</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
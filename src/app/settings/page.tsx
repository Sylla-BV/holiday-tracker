import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import SlackSettingsForm from '@/components/settings/slack-settings-form';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, session.user.email))
    .limit(1);

  if (!user[0]) {
    redirect('/auth/signin');
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
        
        <div className="space-y-6">
          <SlackSettingsForm 
            user={user[0]} 
            userId={user[0].id}
            currentSlackPresenceUpdate={user[0].slackPresenceUpdate}
            currentSlackEmail={user[0].slackEmail}
          />
        </div>
      </div>
    </div>
  );
}
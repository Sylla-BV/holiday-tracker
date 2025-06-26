import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { users, holidayRequests } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, User, Crown, Users, CalendarCheck } from 'lucide-react';
import { UserRoleButton } from '@/components/admin/user-role-button';
import { ApprovalButton } from '@/components/admin/approval-button';
import Header from '@/components/layout/header';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: 'admin' | 'member';
  createdAt: Date;
}

async function getUsers(): Promise<User[]> {
  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);

  return allUsers;
}

async function getPendingRequests() {
  const pendingRequests = await db
    .select({
      id: holidayRequests.id,
      userId: holidayRequests.userId,
      userName: users.name,
      userEmail: users.email,
      startDate: holidayRequests.startDate,
      endDate: holidayRequests.endDate,
      leaveType: holidayRequests.leaveType,
      notes: holidayRequests.notes,
      createdAt: holidayRequests.createdAt,
    })
    .from(holidayRequests)
    .innerJoin(users, eq(holidayRequests.userId, users.id))
    .where(eq(holidayRequests.status, 'pending'))
    .orderBy(holidayRequests.createdAt);

  return pendingRequests;
}

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/admin');
  }

  const currentUser = await db.query.users.findFirst({
    where: (table, { and, eq }) => and(eq(table.id, session.user.id), eq(table.role, 'admin')),
  });

  if (!currentUser) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="w-96">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Access Denied
              </CardTitle>
              <CardDescription>
                You need admin privileges to access this page.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  const [allUsers, pendingRequests] = await Promise.all([
    getUsers(),
    getPendingRequests(),
  ]);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="container mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Crown className="h-8 w-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage user roles and approve holiday requests
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pending Approvals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarCheck className="h-5 w-5" />
                  Pending Approvals
                  {pendingRequests.length > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {pendingRequests.length}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Holiday requests awaiting your approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingRequests.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No pending requests
                    </p>
                  ) : (
                    pendingRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium">{request.userName || 'No name'}</div>
                          <div className="text-sm text-muted-foreground">{request.userEmail}</div>
                          <div className="text-sm mt-1">
                            <span className="capitalize">{request.leaveType}</span> • {' '}
                            {new Date(request.startDate).toLocaleDateString()} - {' '}
                            {new Date(request.endDate).toLocaleDateString()}
                          </div>
                          {request.notes && (
                            <div className="text-sm text-muted-foreground mt-1">
                              "{request.notes}"
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <ApprovalButton 
                            requestId={request.id}
                            action="approved"
                          />
                          <ApprovalButton 
                            requestId={request.id}
                            action="rejected"
                            variant="destructive"
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* User Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  User Management
                </CardTitle>
                <CardDescription>
                  View and manage user roles in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary rounded-full">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium">{user.name || 'No name'}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role === 'admin' ? (
                            <>
                              <Crown className="h-3 w-3 mr-1" />
                              Admin
                            </>
                          ) : (
                            'Member'
                          )}
                        </Badge>
                        
                        {user.email !== session?.user?.email && (
                          <UserRoleButton 
                            userId={user.id}
                            currentRole={user.role}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import { users, accounts, sessions, verificationTokens } from '@/lib/schema';
import { eq } from 'drizzle-orm';

export const authOptions: NextAuthOptions = {
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile',
        },
      },
    }),
  ],
  session: {
    strategy: 'database',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = await db.query.users.findFirst({
          where: (table, { eq }) => eq(table.id, user.id),
        });
        if (dbUser) {
          session.user.role = dbUser.role;
        }
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        const email = user.email || profile?.email;
        if (email && !email.endsWith('@sylla.io') && !email.endsWith('@sylla.ai')) {
          return false;
        }

        // Auto-link accounts: check for existing user with alternate domain
        if (email) {
          const username = email.split('@')[0];
          const altEmail = email.endsWith('@sylla.ai')
            ? `${username}@sylla.io`
            : `${username}@sylla.ai`;

          const existingUser = await db.query.users.findFirst({
            where: (table, { eq }) => eq(table.email, altEmail),
          });

          if (existingUser) {
            // Update existing user's email to the new domain
            await db.update(users)
              .set({ email })
              .where(eq(users.id, existingUser.id));
          }
        }
      }
      return true;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
};
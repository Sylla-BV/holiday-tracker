import { pgTable, uuid, varchar, text, date, timestamp, pgEnum, integer, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { AdapterAccount } from 'next-auth/adapters';

// Enums
export const roleEnum = pgEnum('role', ['admin', 'member']);
export const leaveTypeEnum = pgEnum('leave_type', ['annual', 'sick', 'personal', 'maternity', 'paternity', 'other']);
export const statusEnum = pgEnum('status', ['pending', 'approved', 'rejected']);

// Users table (NextAuth.js compatible)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: varchar('image', { length: 500 }),
  role: roleEnum('role').notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Holiday requests table
export const holidayRequests = pgTable('holiday_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  leaveType: leaveTypeEnum('leave_type').notNull(),
  status: statusEnum('status').notNull().default('pending'),
  notes: text('notes'),
  approvedBy: uuid('approved_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// NextAuth.js required tables
export const accounts = pgTable('accounts', {
  userId: uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 255 }).$type<AdapterAccount['type']>().notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('providerAccountId', { length: 255 }).notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: varchar('token_type', { length: 255 }),
  scope: varchar('scope', { length: 255 }),
  id_token: text('id_token'),
  session_state: varchar('session_state', { length: 255 }),
}, (account) => [
  primaryKey({
    columns: [account.provider, account.providerAccountId],
  }),
]);

export const sessions = pgTable('sessions', {
  sessionToken: varchar('sessionToken', { length: 255 }).notNull().primaryKey(),
  userId: uuid('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable('verificationTokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (vt) => [
  primaryKey({ columns: [vt.identifier, vt.token] }),
]);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  holidayRequests: many(holidayRequests),
  approvedRequests: many(holidayRequests, { relationName: 'approver' }),
}));

export const holidayRequestsRelations = relations(holidayRequests, ({ one }) => ({
  user: one(users, {
    fields: [holidayRequests.userId],
    references: [users.id],
  }),
  approver: one(users, {
    fields: [holidayRequests.approvedBy],
    references: [users.id],
    relationName: 'approver',
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type HolidayRequest = typeof holidayRequests.$inferSelect;
export type NewHolidayRequest = typeof holidayRequests.$inferInsert;
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create SQL client with HTTP connection
const sql = neon(process.env.DATABASE_URL);

// Create drizzle instance
export const db = drizzle({ client: sql, schema });

export type Database = typeof db;
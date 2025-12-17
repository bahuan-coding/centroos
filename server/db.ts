import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../drizzle/schema';

const databaseUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('NETLIFY_DATABASE_URL or DATABASE_URL must be set');
}

const sql = neon(databaseUrl);
const db = drizzle(sql, { schema });

export async function getDb() {
  return db;
}

export { db, schema };

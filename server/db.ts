import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from '../drizzle/schema';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export async function getDb() {
  if (!db) {
    const connection = await mysql.createConnection(
      process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/centroos'
    );
    db = drizzle(connection, { schema, mode: 'default' });
  }
  return db;
}

export { schema };


import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let _db: NeonHttpDatabase<typeof schema> | null = null;

function getDb() {
  if (!_db) {
    const sql = neon(process.env.DATABASE_URL!);
    _db = drizzle({ client: sql, schema });
  }
  return _db;
}

// Lazy proxy so db is usable as an import but doesn't initialize until first use
export const db = new Proxy({} as NeonHttpDatabase<typeof schema>, {
  get(_target, prop) {
    return (getDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

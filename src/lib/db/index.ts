import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

function getDb() {
  if (_db) return _db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not set');
  }
  _client = postgres(connectionString, { connect_timeout: 3 });
  _db = drizzle(_client, { schema });
  return _db;
}

export { schema };

// Lazy proxy: only connects when actually used
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const real = getDb();
    const value = (real as any)[prop];
    if (typeof value === 'function') return value.bind(real);
    return value;
  },
});
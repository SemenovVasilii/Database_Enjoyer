import { config } from 'dotenv';
import { Pool } from 'pg';
import { validateEnvironment } from '../config/environment';
import { runMigrations } from './run-migrations';

async function migrate() {
  config({ path: '.env' });
  const env = validateEnvironment(process.env);
  const pool = new Pool({ connectionString: env.DATABASE_URL, connectionTimeoutMillis: 5000 });
  try {
    await runMigrations(pool);
    console.log('SQL migrations applied');
  } finally {
    await pool.end();
  }
}

migrate().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { Pool } from 'pg';

export async function runMigrations(pool: Pool): Promise<void> {
  const directory = join(__dirname, 'migrations');
  const files = (await readdir(directory)).filter((name) => /^\d+[-_].*\.sql$/.test(name)).sort();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [19224721]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version varchar(200) PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const applied = await client.query<{ version: string }>(
      'SELECT version FROM schema_migrations',
    );
    const versions = new Set(applied.rows.map((row) => row.version));
    for (const file of files) {
      if (versions.has(file)) continue;
      await client.query(await readFile(join(directory, file), 'utf8'));
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

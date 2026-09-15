import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import type { PoolClient, QueryResultRow } from 'pg';
import { runMigrations } from './run-migrations';

@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;

  constructor(config: ConfigService) {
    this.pool = new Pool({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
      max: 10,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
    this.pool.on('error', (error: Error) =>
      this.logger.error('PostgreSQL connection error', error.stack),
    );
  }

  async onModuleInit(): Promise<void> {
    await runMigrations(this.pool);
  }

  query<T extends QueryResultRow = QueryResultRow>(sql: string, parameters?: unknown[]) {
    return this.pool.query<T>(sql, parameters);
  }

  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

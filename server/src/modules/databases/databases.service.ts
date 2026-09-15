import { BadRequestException, Injectable } from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import { ConnectionsService } from '../connections/connections.service';
import { DatabaseService } from '../../database/database.service';
import type {
  DatabaseDetails,
  DatabaseEngine,
  DatabaseSummary,
  SchemaMetadata,
} from './database.types';
import { ImportDatabaseDto } from './dto/import-database.dto';

interface DatabaseRow extends QueryResultRow {
  id: string;
  name: string;
  engine: DatabaseEngine;
  description: string;
  imported_at: Date;
  schema_count: number;
  table_count: number;
  column_count: number;
  schemas?: SchemaMetadata[];
}

@Injectable()
export class DatabasesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly connections: ConnectionsService,
  ) {}

  async list(userId: string): Promise<DatabaseSummary[]> {
    const result = await this.database.query<DatabaseRow>(
      `
      SELECT id, name, engine, description, imported_at, schema_count, table_count, column_count
      FROM databases
      WHERE owner_id = $1
      ORDER BY imported_at DESC, id
    `,
      [userId],
    );
    return [
      ...(await this.connections.list(userId)),
      ...result.rows.map((row) => this.summary(row)),
    ];
  }

  async find(userId: string, id: string): Promise<DatabaseDetails> {
    const result = await this.database.query<DatabaseRow>(
      `
      SELECT id, name, engine, description, imported_at, schema_count, table_count, column_count, schemas
      FROM databases WHERE id = $1 AND owner_id = $2
    `,
      [id, userId],
    );
    const row = result.rows[0];
    if (!row) return this.connections.find(userId, id);
    return { ...this.summary(row), schemas: row.schemas! };
  }

  async import(userId: string, input: ImportDatabaseDto): Promise<DatabaseDetails> {
    this.ensureUnique(
      input.schemas.map((schema) => schema.name),
      'schema',
    );
    let tableCount = 0;
    let columnCount = 0;
    for (const schema of input.schemas) {
      this.ensureUnique(
        schema.tables.map((table) => table.name),
        `table in ${schema.name}`,
      );
      tableCount += schema.tables.length;
      for (const table of schema.tables) {
        this.ensureUnique(
          table.columns.map((column) => column.name),
          `column in ${schema.name}.${table.name}`,
        );
        columnCount += table.columns.length;
      }
    }
    const result = await this.database.query<DatabaseRow>(
      `
      INSERT INTO databases (owner_id, name, engine, description, schemas, schema_count, table_count, column_count)
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
      RETURNING id, name, engine, description, imported_at, schema_count, table_count, column_count, schemas
    `,
      [
        userId,
        input.name,
        input.engine,
        input.description ?? '',
        JSON.stringify(input.schemas),
        input.schemas.length,
        tableCount,
        columnCount,
      ],
    );
    const row = result.rows[0]!;
    return { ...this.summary(row), schemas: row.schemas! };
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.database.query(
      'DELETE FROM databases WHERE id = $1 AND owner_id = $2',
      [id, userId],
    );
    if (!result.rowCount) await this.connections.remove(userId, id);
  }

  private ensureUnique(names: string[], object: string) {
    if (new Set(names).size !== names.length)
      throw new BadRequestException(`Duplicate ${object} names`);
  }

  private summary(row: DatabaseRow): DatabaseSummary {
    return {
      source: 'snapshot',
      id: row.id,
      name: row.name,
      engine: row.engine,
      description: row.description,
      importedAt: row.imported_at.toISOString(),
      schemaCount: row.schema_count,
      tableCount: row.table_count,
      columnCount: row.column_count,
    };
  }
}

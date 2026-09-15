import { BSON, MongoClient } from 'mongodb';
import type { Document } from 'mongodb';
import type {
  ConnectionInput,
  ColumnMetadata,
  TableMetadata,
} from '../../databases/database.types';
import type { Catalog, Connector } from './connector';
import { page } from './connector';

function bsonType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (value && typeof value === 'object' && '_bsontype' in value) return String(value._bsontype);
  if (typeof value === 'object') return 'object';
  return typeof value;
}
function fields(doc: Document, prefix = '', depth = 0): [string, unknown][] {
  return Object.entries(doc).flatMap(([key, value]): [string, unknown][] => {
    const name = prefix ? `${prefix}.${key}` : key;
    const result: [string, unknown][] = [[name, value]];
    if (depth < 4 && bsonType(value) === 'object')
      result.push(...fields(value as Document, name, depth + 1));
    if (depth < 4 && Array.isArray(value))
      for (const item of value.slice(0, 20))
        if (bsonType(item) === 'object')
          result.push(...fields(item as Document, `${name}[]`, depth + 1));
    return result;
  });
}
export class MongoDBConnector implements Connector {
  private async use<T>(
    input: ConnectionInput,
    work: (client: MongoClient) => Promise<T>,
  ): Promise<T> {
    const host =
      input.host.includes(':') && !input.host.startsWith('[') ? `[${input.host}]` : input.host;
    const c = new MongoClient(`mongodb://${host}:${input.port}`, {
      auth: { username: input.username, password: input.password },
      authSource: input.authDatabase || input.databaseName,
      tls: input.tls ?? false,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 12000,
      timeoutMS: 15000,
      maxPoolSize: 2,
      appName: 'DatabaseEnjoyer',
    });
    try {
      await c.connect();
      return await work(c);
    } finally {
      await c.close();
    }
  }
  test(input: ConnectionInput) {
    return this.use(input, async (c) => {
      await c.db(input.databaseName).command({ ping: 1 });
      return 'MongoDB';
    });
  }
  introspect(input: ConnectionInput): Promise<Catalog> {
    return this.use(input, async (c) => {
      const db = c.db(input.databaseName);
      await db.command({ ping: 1 });
      const infos = await db.listCollections({}, { nameOnly: false, maxTimeMS: 10000 }).toArray();
      const tables: TableMetadata[] = [];
      const startedAt = Date.now();
      if (infos.length > 1000) throw new Error('Catalog exceeds 1000 objects');
      for (const info of infos
        .filter((i) => !i.name.startsWith('system.'))
        .sort((a, b) => a.name.localeCompare(b.name))) {
        if (Date.now() - startedAt > 90000) throw new Error('Catalog deadline exceeded');
        const collection = db.collection(info.name);
        const documents = await collection
          .find({}, { maxTimeMS: 10000 })
          .sort({ _id: 1 })
          .limit(200)
          .toArray();
        const types = new Map<string, Set<string>>();
        const presence = new Map<string, number>();
        for (const document of documents) {
          const seen = new Set<string>();
          for (const [name, value] of fields(document)) {
            if (!types.has(name)) types.set(name, new Set());
            types.get(name)!.add(bsonType(value));
            seen.add(name);
          }
          for (const name of seen) presence.set(name, (presence.get(name) ?? 0) + 1);
        }
        const validator = info.options?.validator?.$jsonSchema as
          | { properties?: Record<string, { bsonType?: string | string[] }>; required?: string[] }
          | undefined;
        for (const [name, definition] of Object.entries(validator?.properties ?? {}))
          if (!types.has(name))
            types.set(
              name,
              new Set(
                Array.isArray(definition.bsonType)
                  ? definition.bsonType
                  : [definition.bsonType ?? 'unknown'],
              ),
            );
        const columns: ColumnMetadata[] = [...types.keys()]
          .sort((a, b) => (a === '_id' ? -1 : b === '_id' ? 1 : a.localeCompare(b)))
          .map((name) => ({
            name,
            dataType: [...types.get(name)!].sort().join(' | '),
            nullable: (presence.get(name) ?? 0) < documents.length || types.get(name)!.has('null'),
            primaryKey: name === '_id',
            extra: {
              inferred: true,
              sampleSize: documents.length,
              presentIn: presence.get(name) ?? 0,
              requiredByValidator: validator?.required?.includes(name) ?? false,
            },
          }));
        const indexes =
          info.type === 'view' ? [] : await collection.listIndexes({ maxTimeMS: 10000 }).toArray();
        tables.push({
          name: info.name,
          kind: 'collection',
          columns,
          indexes: indexes.map((i) => ({
            name: String(i.name),
            unique: Boolean(i.unique) || i.name === '_id_',
            primary: i.name === '_id_',
            columns: Object.keys(i.key),
            definition: BSON.EJSON.stringify(i.key),
            extra: BSON.EJSON.serialize(i) as Record<string, unknown>,
          })),
          constraints: [],
          extra: {
            collectionType: info.type,
            validator: BSON.EJSON.serialize(info.options?.validator ?? {}),
            options: BSON.EJSON.serialize(info.options ?? {}),
            schemaInferred: true,
            sampleSize: documents.length,
            sampleLimit: 200,
            maxDepth: 5,
            arraySampleLimit: 20,
          },
        });
      }
      return {
        serverVersion: 'MongoDB (ping verified; buildInfo not requested)',
        schemas: [{ name: input.databaseName, tables }],
      };
    });
  }
  rows(
    input: ConnectionInput,
    _namespace: string,
    object: TableMetadata,
    limit: number,
    offset: number,
  ) {
    return this.use(input, async (c) => {
      const documents = await c
        .db(input.databaseName)
        .collection(object.name)
        .find({}, { maxTimeMS: 10000 })
        .sort({ _id: 1 })
        .skip(offset)
        .limit(limit + 1)
        .toArray();
      const rows = documents.map(
        (d) => BSON.EJSON.serialize(d, { relaxed: false }) as Record<string, unknown>,
      );
      const columns = [...new Set(['_id', ...documents.flatMap((d) => Object.keys(d))])];
      return page(columns, rows, limit, offset, ['_id']);
    });
  }
}

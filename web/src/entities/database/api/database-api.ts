import type {
  ConnectionInput,
  DataPage,
  DatabaseDetails,
  DatabaseSummary,
  ImportDatabaseInput,
  SqlExecutionResult,
} from '@/shared/api/contracts';
import { baseApi } from '@/shared/api';

export const databaseApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    testConnection: builder.mutation<
      { status: string; serverVersion: string; latencyMs: number },
      ConnectionInput
    >({ query: (body) => ({ url: '/connections/test', method: 'POST', body }) }),
    createConnection: builder.mutation<DatabaseDetails, ConnectionInput>({
      query: (body) => ({ url: '/connections', method: 'POST', body }),
      invalidatesTags: ['Database'],
    }),
    syncConnection: builder.mutation<DatabaseDetails, string>({
      query: (id) => ({ url: `/connections/${id}/sync`, method: 'POST' }),
      invalidatesTags: ['Database'],
    }),
    getRows: builder.query<
      DataPage,
      { id: string; objectId: string; offset: number; limit: number }
    >({
      query: ({ id, objectId, offset, limit }) => ({
        url: `/connections/${id}/objects/${objectId}/rows`,
        params: { offset, limit },
      }),
      providesTags: ['Database'],
    }),
    executeSql: builder.mutation<SqlExecutionResult, { id: string; sql: string; maxRows?: number }>(
      {
        query: ({ id, sql, maxRows = 500 }) => ({
          url: `/connections/${id}/query`,
          method: 'POST',
          body: { sql, maxRows },
          timeout: 35000,
        }),
      },
    ),
    getDatabases: builder.query<DatabaseSummary[], void>({
      query: () => '/databases',
      providesTags: ['Database'],
    }),
    getDatabase: builder.query<DatabaseDetails, string>({
      query: (id) => `/databases/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Database', id }],
    }),
    importDatabase: builder.mutation<DatabaseDetails, ImportDatabaseInput>({
      query: (body) => ({ url: '/databases', method: 'POST', body }),
      invalidatesTags: ['Database'],
    }),
    deleteDatabase: builder.mutation<void, string>({
      query: (id) => ({ url: `/databases/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Database'],
    }),
  }),
});

export const {
  useTestConnectionMutation,
  useCreateConnectionMutation,
  useSyncConnectionMutation,
  useGetRowsQuery,
  useExecuteSqlMutation,
  useGetDatabasesQuery,
  useGetDatabaseQuery,
  useImportDatabaseMutation,
  useDeleteDatabaseMutation,
} = databaseApi;

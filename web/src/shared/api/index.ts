import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { FetchArgs } from '@reduxjs/toolkit/query';
import { tokenStorage } from '@/shared/lib/auth-storage';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 15000,
  prepareHeaders: (headers) => {
    const token = tokenStorage.getAccessToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

const isPublicAuth = (args: string | FetchArgs) => {
  const url = typeof args === 'string' ? args : args.url;
  return url.includes('/auth/otp/') || url.includes('/auth/refresh');
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: async (args, api, extraOptions) => {
    const result = await rawBaseQuery(args, api, extraOptions);
    if (result.error?.status === 401 && !isPublicAuth(args)) {
      tokenStorage.clear();
      api.dispatch({ type: 'auth/clearCredentials' });
    }
    return result;
  },
  tagTypes: ['Auth', 'Database'],
  endpoints: () => ({}),
  refetchOnFocus: true,
  refetchOnReconnect: true,
});

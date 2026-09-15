import { baseApi } from '@/shared/api';
import type { AuthTokens } from '../model/auth-slice';

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendOtp: builder.mutation<{ message: string }, { email: string }>({
      query: (body) => ({ url: '/auth/otp/send', method: 'POST', body }),
    }),
    verifyOtp: builder.mutation<AuthTokens, { email: string; code: string }>({
      query: (body) => ({ url: '/auth/otp/verify', method: 'POST', body }),
      invalidatesTags: ['Auth'],
    }),
    me: builder.query<AuthUser, void>({
      query: () => '/auth/me',
      providesTags: ['Auth'],
    }),
  }),
});

export const { useSendOtpMutation, useVerifyOtpMutation, useMeQuery } = authApi;

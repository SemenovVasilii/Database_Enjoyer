import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { tokenStorage } from '@/shared/lib/auth-storage';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const initialState: { accessToken: string | null; refreshToken: string | null } = {
  accessToken: tokenStorage.getAccessToken(),
  refreshToken: tokenStorage.getRefreshToken(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<AuthTokens>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      tokenStorage.setTokens(action.payload.accessToken, action.payload.refreshToken);
    },
    clearCredentials: (state) => {
      state.accessToken = null;
      state.refreshToken = null;
      tokenStorage.clear();
    },
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export const authReducer = authSlice.reducer;

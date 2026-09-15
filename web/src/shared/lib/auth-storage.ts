const ACCESS_TOKEN_KEY = 'database-enjoyer.accessToken';
const REFRESH_TOKEN_KEY = 'database-enjoyer.refreshToken';
const isBrowser = typeof window !== 'undefined';

export const tokenStorage = {
  getAccessToken: () => (isBrowser ? window.localStorage.getItem(ACCESS_TOKEN_KEY) : null),
  getRefreshToken: () => (isBrowser ? window.localStorage.getItem(REFRESH_TOKEN_KEY) : null),
  setTokens: (accessToken: string, refreshToken: string) => {
    if (!isBrowser) return;
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear: () => {
    if (!isBrowser) return;
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

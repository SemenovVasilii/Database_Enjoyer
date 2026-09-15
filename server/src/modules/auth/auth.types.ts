export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export type TokenKind = 'access' | 'refresh';

export interface TokenClaims {
  sub: string;
  userId: string;
  aud: 'web';
  iss: 'database-enjoyer';
  type: TokenKind;
  iat: number;
  exp: number;
}

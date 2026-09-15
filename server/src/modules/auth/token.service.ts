import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { TokenClaims, TokenKind, TokenPair } from './auth.types';

const encode = (value: string) => Buffer.from(value).toString('base64url');

@Injectable()
export class TokenService {
  private readonly accessKey: string;
  private readonly refreshKey: string;
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlSeconds: number;

  constructor(config: ConfigService) {
    this.accessKey = config.getOrThrow<string>('AUTH_ACCESS_TOKEN_KEY');
    this.refreshKey = config.getOrThrow<string>('AUTH_REFRESH_TOKEN_KEY');
    this.accessTtlSeconds = config.getOrThrow<number>('AUTH_ACCESS_TOKEN_TTL_HOURS') * 3600;
    this.refreshTtlSeconds = config.getOrThrow<number>('AUTH_REFRESH_TOKEN_TTL_HOURS') * 3600;
  }

  createPair(userId: string): TokenPair {
    return {
      accessToken: this.create(userId, 'access', this.accessTtlSeconds, this.accessKey),
      refreshToken: this.create(userId, 'refresh', this.refreshTtlSeconds, this.refreshKey),
    };
  }

  verifyAccess(token: string): TokenClaims {
    return this.verify(token, 'access', this.accessKey);
  }

  verifyRefresh(token: string): TokenClaims {
    return this.verify(token, 'refresh', this.refreshKey);
  }

  private create(userId: string, type: TokenKind, ttl: number, key: string): string {
    const now = Math.floor(Date.now() / 1000);
    const header = encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = encode(
      JSON.stringify({
        sub: userId,
        userId,
        aud: 'web',
        iss: 'database-enjoyer',
        type,
        iat: now,
        exp: now + ttl,
      } satisfies TokenClaims),
    );
    const signature = createHmac('sha256', key).update(`${header}.${payload}`).digest('base64url');
    return `${header}.${payload}.${signature}`;
  }

  private verify(token: string, type: TokenKind, key: string): TokenClaims {
    const [header, payload, signature, extra] = token.split('.');
    if (!header || !payload || !signature || extra)
      throw new UnauthorizedException('Invalid token');
    const expected = createHmac('sha256', key).update(`${header}.${payload}`).digest();
    let actual: Buffer;
    try {
      actual = Buffer.from(signature, 'base64url');
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw new UnauthorizedException('Invalid token');
    let claims: TokenClaims;
    try {
      const parsedHeader = JSON.parse(Buffer.from(header, 'base64url').toString()) as {
        alg?: string;
        typ?: string;
      };
      claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as TokenClaims;
      if (parsedHeader.alg !== 'HS256' || parsedHeader.typ !== 'JWT') throw new Error();
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
    const now = Math.floor(Date.now() / 1000);
    if (
      claims.type !== type ||
      claims.aud !== 'web' ||
      claims.iss !== 'database-enjoyer' ||
      !claims.sub ||
      claims.userId !== claims.sub ||
      !Number.isInteger(claims.iat) ||
      !Number.isInteger(claims.exp) ||
      claims.iat > now + 60 ||
      claims.exp <= now
    )
      throw new UnauthorizedException('Token expired or invalid');
    return claims;
  }
}

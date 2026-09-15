export function validateEnvironment(env: Record<string, unknown>) {
  const databaseUrl = String(
    env.DATABASE_URL ?? 'postgresql://verdant:verdant_local@localhost:5432/verdant',
  );
  const url = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(url.protocol))
    throw new Error('DATABASE_URL must point to PostgreSQL');
  const port = Number(env.API_PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('API_PORT must be a valid port');
  const origins = String(env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:8080');
  for (const origin of origins.split(',')) {
    if (new URL(origin).origin !== origin)
      throw new Error('CORS_ORIGIN must contain comma-separated origins');
  }
  const encryptionKey = String(env.CONNECTION_ENCRYPTION_KEY ?? '');
  if (!/^[a-fA-F0-9]{64}$/.test(encryptionKey))
    throw new Error('CONNECTION_ENCRYPTION_KEY must contain 64 hex characters (32 bytes)');
  const accessTokenKey = String(env.AUTH_ACCESS_TOKEN_KEY ?? '');
  const refreshTokenKey = String(env.AUTH_REFRESH_TOKEN_KEY ?? '');
  const otpPepper = String(env.AUTH_OTP_PEPPER ?? '');
  for (const [name, value] of [
    ['AUTH_ACCESS_TOKEN_KEY', accessTokenKey],
    ['AUTH_REFRESH_TOKEN_KEY', refreshTokenKey],
    ['AUTH_OTP_PEPPER', otpPepper],
  ] as const)
    if (value.length < 32) throw new Error(`${name} must contain at least 32 characters`);
  if (accessTokenKey === refreshTokenKey)
    throw new Error('AUTH_ACCESS_TOKEN_KEY and AUTH_REFRESH_TOKEN_KEY must be different');
  const accessTtl = Number(env.AUTH_ACCESS_TOKEN_TTL_HOURS ?? 12);
  const refreshTtl = Number(env.AUTH_REFRESH_TOKEN_TTL_HOURS ?? 168);
  if (!Number.isInteger(accessTtl) || accessTtl < 1 || accessTtl > 24)
    throw new Error('AUTH_ACCESS_TOKEN_TTL_HOURS must be an integer from 1 to 24');
  if (!Number.isInteger(refreshTtl) || refreshTtl < accessTtl || refreshTtl > 24 * 90)
    throw new Error('AUTH_REFRESH_TOKEN_TTL_HOURS must be between access TTL and 2160');
  const bootstrapEmail = String(env.AUTH_BOOTSTRAP_EMAIL ?? '')
    .trim()
    .toLowerCase();
  if (bootstrapEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bootstrapEmail))
    throw new Error('AUTH_BOOTSTRAP_EMAIL must be a valid email');
  const resendApiKey = String(env.RESEND_API_KEY ?? '').trim();
  const resendFromEmail = String(env.RESEND_FROM_EMAIL ?? '').trim();
  if (Boolean(resendApiKey) !== Boolean(resendFromEmail))
    throw new Error('RESEND_API_KEY and RESEND_FROM_EMAIL must be set together');
  return {
    ...env,
    CONNECTION_ENCRYPTION_KEY: encryptionKey,
    DATABASE_URL: databaseUrl,
    API_PORT: port,
    CORS_ORIGIN: origins,
    AUTH_ACCESS_TOKEN_KEY: accessTokenKey,
    AUTH_REFRESH_TOKEN_KEY: refreshTokenKey,
    AUTH_OTP_PEPPER: otpPepper,
    AUTH_ACCESS_TOKEN_TTL_HOURS: accessTtl,
    AUTH_REFRESH_TOKEN_TTL_HOURS: refreshTtl,
    AUTH_BOOTSTRAP_EMAIL: bootstrapEmail,
    RESEND_API_KEY: resendApiKey,
    RESEND_FROM_EMAIL: resendFromEmail,
  };
}

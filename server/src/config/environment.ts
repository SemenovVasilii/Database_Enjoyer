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
  return {
    ...env,
    CONNECTION_ENCRYPTION_KEY: encryptionKey,
    DATABASE_URL: databaseUrl,
    API_PORT: port,
    CORS_ORIGIN: origins,
  };
}

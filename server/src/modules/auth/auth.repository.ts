import { Injectable } from '@nestjs/common';
import type { QueryResultRow } from 'pg';
import { timingSafeEqual } from 'node:crypto';
import { DatabaseService } from '../../database/database.service';
import type { AuthUser } from './auth.types';

interface UserRow extends QueryResultRow {
  id: string;
  email: string;
  created_at: Date;
}

interface CodeRow extends QueryResultRow {
  code_digest: Buffer;
  attempts: number;
  sent_at: Date;
  expires_at: Date;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly db: DatabaseService) {}

  async code(email: string): Promise<CodeRow | undefined> {
    return (
      await this.db.query<CodeRow>(
        'SELECT code_digest,attempts,sent_at,expires_at FROM auth_email_codes WHERE email=$1',
        [email],
      )
    ).rows[0];
  }

  async saveCode(email: string, digest: Buffer, expiresAt: Date): Promise<void> {
    await this.db.query(
      `INSERT INTO auth_email_codes(email,code_digest,attempts,sent_at,expires_at)
       VALUES($1,$2,0,now(),$3)
       ON CONFLICT(email) DO UPDATE SET code_digest=excluded.code_digest,attempts=0,sent_at=now(),expires_at=excluded.expires_at`,
      [email, digest, expiresAt],
    );
  }

  async deleteCode(email: string): Promise<void> {
    await this.db.query('DELETE FROM auth_email_codes WHERE email=$1', [email]);
  }

  async verifyCode(
    email: string,
    digest: Buffer,
  ): Promise<'valid' | 'invalid' | 'expired' | 'locked'> {
    return this.db.transaction(async (client) => {
      const code = (
        await client.query<CodeRow>(
          'SELECT code_digest,attempts,sent_at,expires_at FROM auth_email_codes WHERE email=$1 FOR UPDATE',
          [email],
        )
      ).rows[0];
      if (!code || code.expires_at.getTime() <= Date.now()) {
        await client.query('DELETE FROM auth_email_codes WHERE email=$1', [email]);
        return 'expired';
      }
      if (code.attempts >= 5) return 'locked';
      if (code.code_digest.length !== digest.length || !timingSafeEqual(code.code_digest, digest)) {
        await client.query('UPDATE auth_email_codes SET attempts=attempts+1 WHERE email=$1', [
          email,
        ]);
        return code.attempts + 1 >= 5 ? 'locked' : 'invalid';
      }
      await client.query('DELETE FROM auth_email_codes WHERE email=$1', [email]);
      return 'valid';
    });
  }

  async findOrCreateUser(email: string): Promise<AuthUser> {
    const row = (
      await this.db.query<UserRow>(
        `INSERT INTO users(email) VALUES($1)
         ON CONFLICT(email) DO UPDATE SET last_login_at=now()
         RETURNING id,email,created_at`,
        [email],
      )
    ).rows[0]!;
    return this.mapUser(row);
  }

  async findUser(id: string): Promise<AuthUser | undefined> {
    const row = (
      await this.db.query<UserRow>('SELECT id,email,created_at FROM users WHERE id=$1', [id])
    ).rows[0];
    return row ? this.mapUser(row) : undefined;
  }

  async claimLegacyData(userId: string): Promise<void> {
    await this.db.transaction(async (client) => {
      await client.query('UPDATE connections SET owner_id=$1 WHERE owner_id IS NULL', [userId]);
      await client.query('UPDATE databases SET owner_id=$1 WHERE owner_id IS NULL', [userId]);
    });
  }

  private mapUser(row: UserRow): AuthUser {
    return { id: row.id, email: row.email, createdAt: row.created_at.toISOString() };
  }
}

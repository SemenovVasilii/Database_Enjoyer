import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
export interface EncryptedSecret {
  ciphertext: Buffer;
  nonce: Buffer;
  auth_tag: Buffer;
}
@Injectable()
export class SecretsService {
  private readonly key: Buffer;
  constructor(config: ConfigService) {
    this.key = Buffer.from(config.getOrThrow<string>('CONNECTION_ENCRYPTION_KEY'), 'hex');
  }
  encrypt(id: string, password: string): EncryptedSecret {
    const nonce = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', this.key, nonce);
    c.setAAD(Buffer.from(id));
    return {
      nonce,
      ciphertext: Buffer.concat([c.update(password, 'utf8'), c.final()]),
      auth_tag: c.getAuthTag(),
    };
  }
  decrypt(id: string, secret: EncryptedSecret): string {
    const d = createDecipheriv('aes-256-gcm', this.key, secret.nonce);
    d.setAAD(Buffer.from(id));
    d.setAuthTag(secret.auth_tag);
    return Buffer.concat([d.update(secret.ciphertext), d.final()]).toString('utf8');
  }
}

import {
  GoneException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt } from 'node:crypto';
import { AuthRepository } from './auth.repository';
import { EmailService } from './email.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly otpPepper: string;
  private readonly bootstrapEmail: string;

  constructor(
    private readonly repository: AuthRepository,
    private readonly email: EmailService,
    private readonly tokens: TokenService,
    config: ConfigService,
  ) {
    this.otpPepper = config.getOrThrow<string>('AUTH_OTP_PEPPER');
    this.bootstrapEmail = config.get<string>('AUTH_BOOTSTRAP_EMAIL', '').trim().toLowerCase();
  }

  async sendOtp(email: string) {
    const previous = await this.repository.code(email);
    if (previous && Date.now() - previous.sent_at.getTime() < 60_000)
      throw new HttpException(
        'Новый код можно запросить через минуту',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.repository.saveCode(email, this.digest(email, code), new Date(Date.now() + 600_000));
    try {
      await this.email.sendOtp(email, code);
    } catch (error) {
      await this.repository.deleteCode(email);
      this.logger.error(
        'Failed to send login code',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException('Не удалось отправить код. Попробуйте позже.');
    }
    return { message: 'code sent' };
  }

  async verifyOtp(email: string, code: string) {
    const result = await this.repository.verifyCode(email, this.digest(email, code));
    if (result === 'expired') throw new GoneException('Код истёк. Запросите новый.');
    if (result === 'invalid') throw new UnauthorizedException('Неверный код');
    if (result === 'locked')
      throw new HttpException(
        'Слишком много попыток. Запросите новый код.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    const user = await this.repository.findOrCreateUser(email);
    if (this.bootstrapEmail && email === this.bootstrapEmail)
      await this.repository.claimLegacyData(user.id);
    return this.tokens.createPair(user.id);
  }

  async refresh(refreshToken: string) {
    const claims = this.tokens.verifyRefresh(refreshToken);
    const user = await this.repository.findUser(claims.userId);
    if (!user) throw new UnauthorizedException('User does not exist');
    return this.tokens.createPair(user.id);
  }

  private digest(email: string, code: string): Buffer {
    return createHash('sha256').update(`${email}:${code}:${this.otpPepper}`).digest();
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('RESEND_API_KEY', '');
    this.from = config.get<string>('RESEND_FROM_EMAIL', '');
  }

  async sendOtp(email: string, code: string): Promise<void> {
    if (!this.apiKey || !this.from) {
      this.logger.log(`[OTP-DEV] Code for ${email}: ${code}`);
      return;
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'DatabaseEnjoyer/0.1',
      },
      body: JSON.stringify({
        from: this.from,
        to: [email],
        subject: 'Код входа в DatabaseEnjoyer',
        html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px"><h2 style="margin:0 0 8px;color:#101828">DatabaseEnjoyer</h2><p style="color:#667085;margin:0 0 24px">Код для входа:</p><div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#0033ff;margin-bottom:24px">${code}</div><p style="color:#667085;font-size:14px">Код действителен 10 минут. Если вы не запрашивали вход, проигнорируйте письмо.</p></div>`,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
  }
}

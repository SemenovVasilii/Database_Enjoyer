import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { RefreshTokenDto, SendOtpDto, VerifyOtpDto } from './auth.dto';
import type { AuthUser } from './auth.types';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('otp/send')
  @HttpCode(200)
  sendOtp(@Body() body: SendOtpDto) {
    return this.auth.sendOtp(body.email);
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(200)
  verifyOtp(@Body() body: VerifyOtpDto) {
    return this.auth.verifyOtp(body.email, body.code);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() body: RefreshTokenDto) {
    return this.auth.refresh(body.refreshToken);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}

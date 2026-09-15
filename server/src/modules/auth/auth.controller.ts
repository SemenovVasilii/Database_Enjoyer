import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { RefreshTokenDto, SendOtpDto, VerifyOtpDto } from './auth.dto';
import type { AuthUser } from './auth.types';
import { Public } from './public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('otp/send')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send a six-digit login code to an email address' })
  sendOtp(@Body() body: SendOtpDto) {
    return this.auth.sendOtp(body.email);
  }

  @Public()
  @Post('otp/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify a code, create the user if needed and issue JWT tokens' })
  verifyOtp(@Body() body: VerifyOtpDto) {
    return this.auth.verifyOtp(body.email, body.code);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Exchange a valid refresh token for a new token pair' })
  refresh(@Body() body: RefreshTokenDto) {
    return this.auth.refresh(body.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current email user' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}

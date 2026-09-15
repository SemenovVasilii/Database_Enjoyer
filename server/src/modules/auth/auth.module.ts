import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { EmailService } from './email.service';
import { TokenService } from './token.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthRepository,
    AuthService,
    EmailService,
    TokenService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}

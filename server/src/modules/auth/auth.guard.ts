import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthRepository } from './auth.repository';
import { PUBLIC_ROUTE } from './public.decorator';
import { TokenService } from './token.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly users: AuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme?.toLowerCase() !== 'bearer' || !token)
      throw new UnauthorizedException('Bearer token is required');
    const claims = this.tokens.verifyAccess(token);
    const user = await this.users.findUser(claims.userId);
    if (!user) throw new UnauthorizedException('User does not exist');
    request.user = user;
    return true;
  }
}

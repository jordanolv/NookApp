import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import type { AuthSession } from './auth.types';

export interface AuthenticatedRequest extends Request {
  authSession: AuthSession;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = await this.authService.getSession(req.headers);
    if (!session) throw new UnauthorizedException('not authenticated');
    req.authSession = session;
    return true;
  }
}

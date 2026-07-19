import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermission, type PermissionFlag } from '@nookapp/protocol';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { RolesService, type MemberAuthz } from './roles.service';

const REQUIRED_PERMISSIONS_KEY = 'nookapp:required-permissions';

export const RequirePermission = (...flags: PermissionFlag[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, flags);

export interface AuthorizedRequest extends AuthenticatedRequest {
  authz: MemberAuthz;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolesService: RolesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<AuthorizedRequest & { params: Record<string, string> }>();
    const flags =
      this.reflector.getAllAndOverride<PermissionFlag[] | undefined>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const serverId = req.params.serverId;
    const userId = req.authSession?.user?.id;
    if (!serverId || !userId) throw new ForbiddenException('Unauthorized');

    const authz = await this.rolesService.resolveAuthz(serverId, userId);
    req.authz = authz;

    if (authz.isOwner) return true;
    for (const flag of flags) {
      if (!hasPermission(authz.permissions, flag)) {
        throw new ForbiddenException('Missing required permission');
      }
    }
    return true;
  }
}

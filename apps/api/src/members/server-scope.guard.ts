import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { member, server, type Database } from '@nookapp/db';
import { DB } from '../database/database.module';
import type { AuthenticatedRequest } from '../auth/auth.guard';

export interface ServerScopedRequest extends AuthenticatedRequest {
  server: typeof server.$inferSelect;
  member: typeof member.$inferSelect;
}

@Injectable()
export class ServerScopeGuard implements CanActivate {
  constructor(@Inject(DB) private readonly db: Database) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<ServerScopedRequest>();
    const serverId = req.params['serverId'] as string;
    const userId = req.authSession?.user?.id;

    if (!serverId || !userId) return false;

    const [srv] = await this.db.select().from(server).where(eq(server.id, serverId)).limit(1);

    if (!srv) throw new NotFoundException('Server not found');

    const [mem] = await this.db
      .select()
      .from(member)
      .where(and(eq(member.serverId, serverId), eq(member.userId, userId)))
      .limit(1);

    if (!mem) throw new ForbiddenException('Not a member of this server');

    req.server = srv;
    req.member = mem;
    return true;
  }
}

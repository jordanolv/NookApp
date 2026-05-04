import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ServerScopedRequest } from './server-scope.guard';

export const CurrentMember = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<ServerScopedRequest>();
  return req.member;
});

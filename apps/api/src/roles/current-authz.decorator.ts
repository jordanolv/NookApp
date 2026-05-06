import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthorizedRequest } from './permissions.guard';

export const CurrentAuthz = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<AuthorizedRequest>();
  return req.authz;
});

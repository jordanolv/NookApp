import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import type { AuthSession } from './auth.types';

function makeContext(req: object): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

const fakeSession: AuthSession = {
  user: { id: 'u_1', email: 'a@b.c', name: 'Alice', emailVerified: true, image: null },
  session: { id: 's_1', userId: 'u_1', expiresAt: new Date(Date.now() + 60_000) },
};

describe('AuthGuard', () => {
  it('attaches session and returns true when authenticated', async () => {
    const service = {
      getSession: jest.fn().mockResolvedValue(fakeSession),
    } as unknown as AuthService;
    const guard = new AuthGuard(service);
    const req: { headers: object; authSession?: AuthSession } = { headers: { cookie: 'x' } };

    await expect(guard.canActivate(makeContext(req))).resolves.toBe(true);
    expect(req.authSession).toBe(fakeSession);
  });

  it('throws Unauthorized when no session', async () => {
    const service = { getSession: jest.fn().mockResolvedValue(null) } as unknown as AuthService;
    const guard = new AuthGuard(service);

    await expect(guard.canActivate(makeContext({ headers: {} }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});

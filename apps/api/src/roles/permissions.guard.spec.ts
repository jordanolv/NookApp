import { ForbiddenException, NotFoundException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { PERMISSIONS } from '@nookapp/protocol';
import { PermissionsGuard, RequirePermission, type AuthorizedRequest } from './permissions.guard';
import { RolesService, type MemberAuthz } from './roles.service';

const mockReflector = {
  getAllAndOverride: jest.fn(),
};

const mockRolesService = {
  resolveAuthz: jest.fn(),
};

type GuardRequest = Partial<AuthorizedRequest> & { params: Record<string, string> };

function contextFor(req: GuardRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => jest.fn(),
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

function requestFor(userId: string | undefined, serverId: string | undefined): GuardRequest {
  return {
    params: serverId ? { serverId } : {},
    ...(userId && {
      authSession: { user: { id: userId } },
    }),
  } as GuardRequest;
}

function authz(overrides: Partial<MemberAuthz> = {}): MemberAuthz {
  return {
    memberId: 'm1',
    isOwner: false,
    permissions: 0,
    roleIds: [],
    topPosition: 0,
    ...overrides,
  };
}

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        PermissionsGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: RolesService, useValue: mockRolesService },
      ],
    }).compile();
    guard = module.get(PermissionsGuard);
  });

  it('stores the declared flags as handler metadata', () => {
    class Controller {
      @RequirePermission(PERMISSIONS.ManageRoles, PERMISSIONS.ManageServer)
      handler() {}
    }

    const flags = new Reflector().get<number[]>(
      'nookapp:required-permissions',
      Controller.prototype.handler,
    );
    expect(flags).toEqual([PERMISSIONS.ManageRoles, PERMISSIONS.ManageServer]);
  });

  it('throws ForbiddenException when the route has no serverId param', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([PERMISSIONS.ManageRoles]);

    await expect(guard.canActivate(contextFor(requestFor('u1', undefined)))).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockRolesService.resolveAuthz).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when the request carries no session user', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([PERMISSIONS.ManageRoles]);

    await expect(guard.canActivate(contextFor(requestFor(undefined, 's1')))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('lets the owner through even without the required flag', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([PERMISSIONS.ManageServer]);
    mockRolesService.resolveAuthz.mockResolvedValue(authz({ isOwner: true, permissions: 0 }));

    await expect(guard.canActivate(contextFor(requestFor('u1', 's1')))).resolves.toBe(true);
  });

  it('allows a member holding every required flag and exposes authz on the request', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([
      PERMISSIONS.ManageRoles,
      PERMISSIONS.ManageChannels,
    ]);
    const resolved = authz({
      permissions: PERMISSIONS.ManageRoles | PERMISSIONS.ManageChannels | PERMISSIONS.ViewChannels,
    });
    mockRolesService.resolveAuthz.mockResolvedValue(resolved);
    const req = requestFor('u1', 's1');

    await expect(guard.canActivate(contextFor(req))).resolves.toBe(true);
    expect(req.authz).toBe(resolved);
    expect(mockRolesService.resolveAuthz).toHaveBeenCalledWith('s1', 'u1');
  });

  it('rejects a member missing one of several required flags', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([
      PERMISSIONS.ManageRoles,
      PERMISSIONS.ManageChannels,
    ]);
    mockRolesService.resolveAuthz.mockResolvedValue(
      authz({ permissions: PERMISSIONS.ManageRoles }),
    );

    await expect(guard.canActivate(contextFor(requestFor('u1', 's1')))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows any member when the handler declares no permission metadata', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    mockRolesService.resolveAuthz.mockResolvedValue(authz());

    await expect(guard.canActivate(contextFor(requestFor('u1', 's1')))).resolves.toBe(true);
  });

  it('propagates the rejection when the user is not a member of the server', async () => {
    mockReflector.getAllAndOverride.mockReturnValue([]);
    mockRolesService.resolveAuthz.mockRejectedValue(new NotFoundException('Server not found'));

    await expect(guard.canActivate(contextFor(requestFor('u1', 's1')))).rejects.toThrow(
      NotFoundException,
    );
  });
});

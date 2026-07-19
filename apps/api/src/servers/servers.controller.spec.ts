import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import { ServerScopeGuard } from '../members/server-scope.guard';
import type { AuthSession } from '../auth/auth.types';
import { InvitesController } from './invites.controller';
import { ServersController } from './servers.controller';
import { ServersService } from './servers.service';

const user: AuthSession['user'] = {
  id: 'u1',
  email: 'u1@nookapp.test',
  name: 'User One',
  emailVerified: true,
  createdAt: new Date('2025-01-01'),
};

const mockServersService = {
  createServer: jest.fn(),
  listMyServers: jest.fn(),
  getServer: jest.fn(),
  updateServer: jest.fn(),
  deleteServer: jest.fn(),
  createInvite: jest.fn(),
  joinViaInvite: jest.fn(),
};

const allowAll = { canActivate: () => true };

describe('ServersController', () => {
  let controller: ServersController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [ServersController],
      providers: [{ provide: ServersService, useValue: mockServersService }],
    })
      .overrideGuard(AuthGuard)
      .useValue(allowAll)
      .overrideGuard(ServerScopeGuard)
      .useValue(allowAll)
      .compile();
    controller = module.get(ServersController);
  });

  it('creates a server owned by the session user', async () => {
    mockServersService.createServer.mockResolvedValue({ id: 's1' });

    await expect(controller.create(user, { name: 'My Nook' })).resolves.toEqual({ id: 's1' });
    expect(mockServersService.createServer).toHaveBeenCalledWith('u1', { name: 'My Nook' });
  });

  it('lists only the servers of the session user', async () => {
    mockServersService.listMyServers.mockResolvedValue([]);

    await controller.listMine(user);
    expect(mockServersService.listMyServers).toHaveBeenCalledWith('u1');
  });

  it('reads a server scoped by both the path id and the session user', async () => {
    mockServersService.getServer.mockResolvedValue({ id: 's1' });

    await controller.getById(user, 's1');
    expect(mockServersService.getServer).toHaveBeenCalledWith('s1', 'u1');
  });

  it('updates a server with the acting user for the ownership check', async () => {
    mockServersService.updateServer.mockResolvedValue({ id: 's1', name: 'Renamed' });

    await controller.update(user, 's1', { name: 'Renamed' });
    expect(mockServersService.updateServer).toHaveBeenCalledWith('s1', 'u1', { name: 'Renamed' });
  });

  it('deletes a server with the acting user for the ownership check', async () => {
    mockServersService.deleteServer.mockResolvedValue(undefined);

    await controller.remove(user, 's1');
    expect(mockServersService.deleteServer).toHaveBeenCalledWith('s1', 'u1');
  });

  it('creates an invite scoped to the server in the path', async () => {
    mockServersService.createInvite.mockResolvedValue({ code: 'abc' });

    await controller.createInvite(user, 's1', { maxUses: 5 });
    expect(mockServersService.createInvite).toHaveBeenCalledWith('s1', 'u1', { maxUses: 5 });
  });

  it('joins via an invite code without requiring an existing membership', async () => {
    mockServersService.joinViaInvite.mockResolvedValue({ id: 's1' });

    await controller.joinViaInvite(user, 'abc');
    expect(mockServersService.joinViaInvite).toHaveBeenCalledWith('abc', 'u1');
  });

  it('propagates a forbidden update', async () => {
    mockServersService.updateServer.mockRejectedValue(new ForbiddenException());

    await expect(controller.update(user, 's1', { name: 'x' })).rejects.toThrow(ForbiddenException);
  });
});

describe('InvitesController', () => {
  let controller: InvitesController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [InvitesController],
      providers: [{ provide: ServersService, useValue: mockServersService }],
    })
      .overrideGuard(AuthGuard)
      .useValue(allowAll)
      .overrideGuard(ServerScopeGuard)
      .useValue(allowAll)
      .compile();
    controller = module.get(InvitesController);
  });

  it('joins via the code in the path for the session user', async () => {
    mockServersService.joinViaInvite.mockResolvedValue({ id: 's1' });

    await expect(controller.join(user, 'abc')).resolves.toEqual({ id: 's1' });
    expect(mockServersService.joinViaInvite).toHaveBeenCalledWith('abc', 'u1');
  });

  it('propagates an unknown invite code', async () => {
    mockServersService.joinViaInvite.mockRejectedValue(new NotFoundException());

    await expect(controller.join(user, 'nope')).rejects.toThrow(NotFoundException);
  });
});

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import { ServerScopeGuard } from './server-scope.guard';
import type { AuthSession } from '../auth/auth.types';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

const user: AuthSession['user'] = {
  id: 'u1',
  email: 'u1@nookapp.test',
  name: 'User One',
  emailVerified: true,
  createdAt: new Date('2025-01-01'),
};

const mockMembersService = {
  listMembers: jest.fn(),
  getMember: jest.fn(),
  kickMember: jest.fn(),
  listBans: jest.fn(),
  banMember: jest.fn(),
  unbanMember: jest.fn(),
};

const allowAll = { canActivate: () => true };

describe('MembersController', () => {
  let controller: MembersController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [MembersController],
      providers: [{ provide: MembersService, useValue: mockMembersService }],
    })
      .overrideGuard(AuthGuard)
      .useValue(allowAll)
      .overrideGuard(ServerScopeGuard)
      .useValue(allowAll)
      .compile();
    controller = module.get(MembersController);
  });

  it('lists members scoped to the server from the path', async () => {
    mockMembersService.listMembers.mockResolvedValue([{ userId: 'u1' }]);

    await expect(controller.list(user, 's1')).resolves.toEqual([{ userId: 'u1' }]);
    expect(mockMembersService.listMembers).toHaveBeenCalledWith('s1', 'u1');
  });

  it('resolves the current membership from the session user', async () => {
    mockMembersService.getMember.mockResolvedValue({ userId: 'u1', role: 'owner' });

    await controller.me(user, 's1');
    expect(mockMembersService.getMember).toHaveBeenCalledWith('s1', 'u1');
  });

  it('kicks the path user on behalf of the acting user', async () => {
    mockMembersService.kickMember.mockResolvedValue(undefined);

    await controller.kick(user, 's1', 'u2');
    expect(mockMembersService.kickMember).toHaveBeenCalledWith('s1', 'u2', 'u1');
  });

  it('lists bans scoped to the server', async () => {
    mockMembersService.listBans.mockResolvedValue([]);

    await controller.listBans(user, 's1');
    expect(mockMembersService.listBans).toHaveBeenCalledWith('s1', 'u1');
  });

  it('bans the path user and returns no body', async () => {
    mockMembersService.banMember.mockResolvedValue({ userId: 'u2' });

    await expect(controller.ban(user, 's1', 'u2', { reason: 'spam' })).resolves.toBeUndefined();
    expect(mockMembersService.banMember).toHaveBeenCalledWith('s1', 'u2', 'u1', {
      reason: 'spam',
    });
  });

  it('unbans the path user and returns no body', async () => {
    mockMembersService.unbanMember.mockResolvedValue(undefined);

    await expect(controller.unban(user, 's1', 'u2')).resolves.toBeUndefined();
    expect(mockMembersService.unbanMember).toHaveBeenCalledWith('s1', 'u2', 'u1');
  });

  it('propagates a forbidden ban attempt', async () => {
    mockMembersService.banMember.mockRejectedValue(new ForbiddenException());

    await expect(controller.ban(user, 's1', 'u2', {})).rejects.toThrow(ForbiddenException);
  });

  it('propagates a missing member on kick', async () => {
    mockMembersService.kickMember.mockRejectedValue(new NotFoundException());

    await expect(controller.kick(user, 's1', 'u2')).rejects.toThrow(NotFoundException);
  });
});

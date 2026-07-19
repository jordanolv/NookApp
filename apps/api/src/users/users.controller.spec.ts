import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import type { DeleteAccountInput, UiLayoutPatchInput } from '@nookapp/protocol';
import type { AuthSession } from '../auth/auth.types';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const user: AuthSession['user'] = {
  id: 'u1',
  email: 'u1@nookapp.test',
  name: 'User One',
  emailVerified: true,
  createdAt: new Date('2025-01-01'),
};

const mockUsersService = {
  getProfile: jest.fn(),
  getUiLayout: jest.fn(),
  patchUiLayout: jest.fn(),
  listOwnedServers: jest.fn(),
  exportData: jest.fn(),
  deleteAccount: jest.fn(),
};

const allowAll = { canActivate: () => true };

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      .overrideGuard(AuthGuard)
      .useValue(allowAll)
      .compile();
    controller = module.get(UsersController);
  });

  it('reads the profile of the session user, never an id from the request', async () => {
    mockUsersService.getProfile.mockResolvedValue({ id: 'u1' });

    await expect(controller.me(user)).resolves.toEqual({ id: 'u1' });
    expect(mockUsersService.getProfile).toHaveBeenCalledWith('u1');
  });

  it('reads the ui layout of the session user', async () => {
    mockUsersService.getUiLayout.mockResolvedValue({ entries: {} });

    await controller.getUiLayout(user);
    expect(mockUsersService.getUiLayout).toHaveBeenCalledWith('u1');
  });

  it('patches the ui layout with the body as-is', async () => {
    const body: UiLayoutPatchInput = { entries: { chat: { x: 10, y: 20 } } };
    mockUsersService.patchUiLayout.mockResolvedValue(body);

    await controller.patchUiLayout(user, body);
    expect(mockUsersService.patchUiLayout).toHaveBeenCalledWith('u1', body);
  });

  it('lists the servers owned by the session user', async () => {
    mockUsersService.listOwnedServers.mockResolvedValue([]);

    await controller.ownedServers(user);
    expect(mockUsersService.listOwnedServers).toHaveBeenCalledWith('u1');
  });

  it('exports the data of the session user', async () => {
    mockUsersService.exportData.mockResolvedValue({ user: { id: 'u1' } });

    await controller.exportData(user);
    expect(mockUsersService.exportData).toHaveBeenCalledWith('u1');
  });

  it('deletes the session account with the ownership transfer map', async () => {
    const body: DeleteAccountInput = { transfers: { s1: 'u2', s2: null } };
    mockUsersService.deleteAccount.mockResolvedValue(undefined);

    await controller.deleteMe(user, body);
    expect(mockUsersService.deleteAccount).toHaveBeenCalledWith('u1', body);
  });

  it('propagates a rejected account deletion', async () => {
    mockUsersService.deleteAccount.mockRejectedValue(new BadRequestException());

    await expect(controller.deleteMe(user, { transfers: {} })).rejects.toThrow(BadRequestException);
  });
});

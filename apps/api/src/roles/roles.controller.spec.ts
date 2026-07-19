import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PermissionsGuard } from './permissions.guard';
import { AuthGuard } from '../auth/auth.guard';
import type { CreateRoleInput, UpdateRoleInput } from '@nookapp/protocol';
import type { AuthSession } from '../auth/auth.types';
import { MemberRolesController, RolesController } from './roles.controller';
import { RolesService } from './roles.service';

const user: AuthSession['user'] = {
  id: 'u1',
  email: 'u1@nookapp.test',
  name: 'User One',
  emailVerified: true,
  createdAt: new Date('2025-01-01'),
};

const mockRolesService = {
  listRoles: jest.fn(),
  createRole: jest.fn(),
  reorderRoles: jest.fn(),
  updateRole: jest.fn(),
  deleteRole: jest.fn(),
  setMemberRoles: jest.fn(),
};

const allowAll = { canActivate: () => true };

describe('RolesController', () => {
  let controller: RolesController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [{ provide: RolesService, useValue: mockRolesService }],
    })
      .overrideGuard(PermissionsGuard)
      .useValue(allowAll)
      .overrideGuard(AuthGuard)
      .useValue(allowAll)
      .compile();
    controller = module.get(RolesController);
  });

  it('lists roles scoped to the server from the path', async () => {
    mockRolesService.listRoles.mockResolvedValue([{ id: 'r1' }]);

    await expect(controller.list('s1')).resolves.toEqual([{ id: 'r1' }]);
    expect(mockRolesService.listRoles).toHaveBeenCalledWith('s1');
  });

  it('creates a role with the server scope and the acting user', async () => {
    const body: CreateRoleInput = { name: 'Moderator', permissions: 8 };
    mockRolesService.createRole.mockResolvedValue({ id: 'r1' });

    await expect(controller.create(user, 's1', body)).resolves.toEqual({ id: 'r1' });
    expect(mockRolesService.createRole).toHaveBeenCalledWith('s1', 'u1', body);
  });

  it('unwraps roleIds from the reorder body', async () => {
    mockRolesService.reorderRoles.mockResolvedValue([]);

    await controller.reorder(user, 's1', { roleIds: ['r2', 'r1'] });
    expect(mockRolesService.reorderRoles).toHaveBeenCalledWith('s1', 'u1', ['r2', 'r1']);
  });

  it('updates a role with both path params in the documented order', async () => {
    const body: UpdateRoleInput = { name: 'Renamed' };
    mockRolesService.updateRole.mockResolvedValue({ id: 'r1', name: 'Renamed' });

    await controller.update(user, 's1', 'r1', body);
    expect(mockRolesService.updateRole).toHaveBeenCalledWith('s1', 'r1', 'u1', body);
  });

  it('deletes a role with the server scope and the acting user', async () => {
    mockRolesService.deleteRole.mockResolvedValue(undefined);

    await controller.remove(user, 's1', 'r1');
    expect(mockRolesService.deleteRole).toHaveBeenCalledWith('s1', 'r1', 'u1');
  });

  it('propagates a service rejection instead of swallowing it', async () => {
    mockRolesService.deleteRole.mockRejectedValue(new ForbiddenException());

    await expect(controller.remove(user, 's1', 'r1')).rejects.toThrow(ForbiddenException);
  });
});

describe('MemberRolesController', () => {
  let controller: MemberRolesController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [MemberRolesController],
      providers: [{ provide: RolesService, useValue: mockRolesService }],
    })
      .overrideGuard(PermissionsGuard)
      .useValue(allowAll)
      .overrideGuard(AuthGuard)
      .useValue(allowAll)
      .compile();
    controller = module.get(MemberRolesController);
  });

  it('passes the target user from the path, not the acting user', async () => {
    const body = { roleIds: ['r1'] };
    mockRolesService.setMemberRoles.mockResolvedValue({ userId: 'u2' });

    await controller.set(user, 's1', 'u2', body);
    expect(mockRolesService.setMemberRoles).toHaveBeenCalledWith('s1', 'u2', 'u1', body);
  });

  it('propagates a service rejection instead of swallowing it', async () => {
    mockRolesService.setMemberRoles.mockRejectedValue(new ForbiddenException());

    await expect(controller.set(user, 's1', 'u2', { roleIds: [] })).rejects.toThrow(
      ForbiddenException,
    );
  });
});

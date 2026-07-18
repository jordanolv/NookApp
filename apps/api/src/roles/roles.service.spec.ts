import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ALL_PERMISSIONS, DEFAULT_EVERYONE_PERMISSIONS, PERMISSIONS } from '@nookapp/protocol';
import { DB } from '../database/database.module';
import { RolesService, type MemberAuthz } from './roles.service';

const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

interface RoleRow {
  id: string;
  serverId: string;
  name: string;
  color: string | null;
  position: number;
  permissions: number;
  isEveryone: boolean;
  createdAt: Date;
}

function roleRow(overrides: Partial<RoleRow> = {}): RoleRow {
  return {
    id: 'r1',
    serverId: 's1',
    name: 'Moderator',
    color: null,
    position: 2,
    permissions: 0,
    isEveryone: false,
    createdAt: new Date('2025-01-01'),
    ...overrides,
  };
}

function authz(overrides: Partial<MemberAuthz> = {}): MemberAuthz {
  return {
    memberId: 'm1',
    isOwner: false,
    permissions: PERMISSIONS.ManageRoles,
    roleIds: [],
    topPosition: 5,
    ...overrides,
  };
}

/** select().from().where().limit() */
function limitChain(result: unknown[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
  };
}

/** select().from().where() */
function whereChain(result: unknown[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(result),
  };
}

/** select().from().where().orderBy() */
function orderByChain(result: unknown[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockResolvedValue(result),
  };
}

/** select().from().where().orderBy().limit() */
function orderByLimitChain(result: unknown[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
  };
}

/** select().from().innerJoin().where() */
function joinChain(result: unknown[]) {
  return {
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockResolvedValue(result),
  };
}

describe('RolesService', () => {
  let service: RolesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [RolesService, { provide: DB, useValue: mockDb }],
    }).compile();
    service = module.get(RolesService);
  });

  describe('ensureEveryoneRole', () => {
    it('returns the existing @everyone role', async () => {
      const existing = roleRow({
        id: 'everyone',
        name: '@everyone',
        isEveryone: true,
        position: 0,
      });
      mockDb.select.mockReturnValueOnce(limitChain([existing]));

      await expect(service.ensureEveryoneRole('s1')).resolves.toBe(existing);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('creates @everyone with the default permissions when missing', async () => {
      mockDb.select.mockReturnValueOnce(limitChain([]));
      const created = roleRow({ id: 'everyone', isEveryone: true });
      const values = jest
        .fn()
        .mockReturnValue({ returning: jest.fn().mockResolvedValue([created]) });
      mockDb.insert.mockReturnValue({ values });

      await expect(service.ensureEveryoneRole('s1')).resolves.toBe(created);
      expect(values).toHaveBeenCalledWith(
        expect.objectContaining({
          serverId: 's1',
          name: '@everyone',
          position: 0,
          permissions: DEFAULT_EVERYONE_PERMISSIONS,
          isEveryone: true,
        }),
      );
    });

    it('propagates a database failure', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(new Error('connection lost')),
      });

      await expect(service.ensureEveryoneRole('s1')).rejects.toThrow('connection lost');
    });
  });

  describe('listRoles', () => {
    it('maps rows to the public shape', async () => {
      mockDb.select.mockReturnValueOnce(
        orderByChain([roleRow({ id: 'r1', color: '#ff0000', permissions: PERMISSIONS.ManageMap })]),
      );

      const result = await service.listRoles('s1');

      expect(result).toEqual([
        {
          id: 'r1',
          serverId: 's1',
          name: 'Moderator',
          color: '#ff0000',
          position: 2,
          permissions: PERMISSIONS.ManageMap,
          isEveryone: false,
          createdAt: new Date('2025-01-01').toISOString(),
        },
      ]);
    });

    it('propagates a database failure', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockRejectedValue(new Error('connection lost')),
      });

      await expect(service.listRoles('s1')).rejects.toThrow('connection lost');
    });
  });

  describe('resolveAuthz', () => {
    it('throws NotFoundException when the server does not exist', async () => {
      mockDb.select.mockReturnValueOnce(limitChain([]));

      await expect(service.resolveAuthz('s1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when the user is not a member', async () => {
      mockDb.select
        .mockReturnValueOnce(limitChain([{ ownerId: 'u9' }]))
        .mockReturnValueOnce(limitChain([]));

      await expect(service.resolveAuthz('s1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('grants every permission to the owner regardless of its roles', async () => {
      mockDb.select
        .mockReturnValueOnce(limitChain([{ ownerId: 'u1' }]))
        .mockReturnValueOnce(limitChain([{ id: 'm1' }]))
        .mockReturnValueOnce(limitChain([{ permissions: 0 }]))
        .mockReturnValueOnce(joinChain([{ id: 'r1', permissions: 0, position: 1 }]));

      const result = await service.resolveAuthz('s1', 'u1');

      expect(result.isOwner).toBe(true);
      expect(result.permissions).toBe(ALL_PERMISSIONS);
      expect(result.roleIds).toEqual(['r1']);
      expect(result.topPosition).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('ORs @everyone with the assigned roles and keeps the highest position', async () => {
      mockDb.select
        .mockReturnValueOnce(limitChain([{ ownerId: 'u9' }]))
        .mockReturnValueOnce(limitChain([{ id: 'm1' }]))
        .mockReturnValueOnce(limitChain([{ permissions: PERMISSIONS.ViewChannels }]))
        .mockReturnValueOnce(
          joinChain([
            { id: 'r1', permissions: PERMISSIONS.SendMessages, position: 1 },
            { id: 'r2', permissions: PERMISSIONS.ManageRoles, position: 4 },
          ]),
        );

      const result = await service.resolveAuthz('s1', 'u1');

      expect(result.isOwner).toBe(false);
      expect(result.permissions).toBe(
        PERMISSIONS.ViewChannels | PERMISSIONS.SendMessages | PERMISSIONS.ManageRoles,
      );
      expect(result.roleIds).toEqual(['r1', 'r2']);
      expect(result.topPosition).toBe(4);
    });

    it('falls back to zero permissions when @everyone is missing', async () => {
      mockDb.select
        .mockReturnValueOnce(limitChain([{ ownerId: 'u9' }]))
        .mockReturnValueOnce(limitChain([{ id: 'm1' }]))
        .mockReturnValueOnce(limitChain([]))
        .mockReturnValueOnce(joinChain([]));

      const result = await service.resolveAuthz('s1', 'u1');

      expect(result.permissions).toBe(0);
      expect(result.topPosition).toBe(0);
    });
  });

  describe('createRole', () => {
    it('creates the role just below the requester highest role', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ topPosition: 9 }));
      mockDb.select.mockReturnValueOnce(orderByLimitChain([{ maxPosition: 3 }]));
      const created = roleRow({ id: 'new', name: 'Helper', position: 4 });
      const values = jest
        .fn()
        .mockReturnValue({ returning: jest.fn().mockResolvedValue([created]) });
      mockDb.insert.mockReturnValue({ values });

      const result = await service.createRole('s1', 'u1', { name: 'Helper' });

      expect(result.id).toBe('new');
      expect(values).toHaveBeenCalledWith(expect.objectContaining({ position: 4, permissions: 0 }));
    });

    it('defaults the position to 1 when the server has no other role', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ isOwner: true }));
      mockDb.select.mockReturnValueOnce(orderByLimitChain([]));
      const values = jest
        .fn()
        .mockReturnValue({ returning: jest.fn().mockResolvedValue([roleRow({ position: 1 })]) });
      mockDb.insert.mockReturnValue({ values });

      await service.createRole('s1', 'u1', { name: 'Helper' });

      expect(values).toHaveBeenCalledWith(expect.objectContaining({ position: 1 }));
    });

    it('refuses a requester without ManageRoles', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ permissions: 0 }));

      await expect(service.createRole('s1', 'u1', { name: 'Helper' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('refuses granting a permission the requester does not have', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz());

      await expect(
        service.createRole('s1', 'u1', { name: 'Helper', permissions: PERMISSIONS.ManageServer }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('refuses creating a role at or above the requester highest role', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ topPosition: 1 }));
      mockDb.select.mockReturnValueOnce(orderByLimitChain([{ maxPosition: 5 }]));

      await expect(service.createRole('s1', 'u1', { name: 'Helper' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateRole', () => {
    function mockUpdateReturning(row: RoleRow) {
      const returning = jest.fn().mockResolvedValue([row]);
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({ where: jest.fn().mockReturnValue({ returning }) }),
      });
      return returning;
    }

    it('updates name, color and permissions', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ isOwner: true }));
      mockDb.select.mockReturnValueOnce(limitChain([roleRow()]));
      mockUpdateReturning(roleRow({ name: 'Renamed', color: '#00ff00' }));

      const result = await service.updateRole('s1', 'r1', 'u1', {
        name: 'Renamed',
        color: '#00ff00',
      });

      expect(result.name).toBe('Renamed');
      expect(result.color).toBe('#00ff00');
    });

    it('throws NotFoundException when the role does not belong to the server', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ isOwner: true }));
      mockDb.select.mockReturnValueOnce(limitChain([]));

      await expect(service.updateRole('s1', 'r1', 'u1', { name: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('refuses renaming @everyone', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ isOwner: true }));
      mockDb.select.mockReturnValueOnce(
        limitChain([roleRow({ name: '@everyone', isEveryone: true, position: 0 })]),
      );

      await expect(service.updateRole('s1', 'r1', 'u1', { name: 'renamed' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows editing @everyone permissions without touching its name', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ isOwner: true }));
      const everyone = roleRow({ name: '@everyone', isEveryone: true, position: 0 });
      mockDb.select.mockReturnValueOnce(limitChain([everyone]));
      mockUpdateReturning({ ...everyone, permissions: PERMISSIONS.ViewChannels });

      const result = await service.updateRole('s1', 'r1', 'u1', {
        permissions: PERMISSIONS.ViewChannels,
      });

      expect(result.permissions).toBe(PERMISSIONS.ViewChannels);
    });

    it('refuses editing a role ranked at or above the requester', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ topPosition: 2 }));
      mockDb.select.mockReturnValueOnce(limitChain([roleRow({ position: 2 })]));

      await expect(service.updateRole('s1', 'r1', 'u1', { name: 'x' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('refuses granting a permission the requester does not have', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ topPosition: 5 }));
      mockDb.select.mockReturnValueOnce(limitChain([roleRow({ position: 2 })]));

      await expect(
        service.updateRole('s1', 'r1', 'u1', { permissions: PERMISSIONS.ManageServer }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteRole', () => {
    it('deletes a role the requester outranks', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ topPosition: 5 }));
      mockDb.select.mockReturnValueOnce(limitChain([roleRow({ position: 2 })]));
      mockDb.delete.mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });

      await expect(service.deleteRole('s1', 'r1', 'u1')).resolves.toBeUndefined();
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('throws NotFoundException when the role is missing', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ isOwner: true }));
      mockDb.select.mockReturnValueOnce(limitChain([]));

      await expect(service.deleteRole('s1', 'r1', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('refuses deleting @everyone even for the owner', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ isOwner: true }));
      mockDb.select.mockReturnValueOnce(limitChain([roleRow({ isEveryone: true, position: 0 })]));

      await expect(service.deleteRole('s1', 'r1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('refuses deleting a role ranked at or above the requester', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ topPosition: 2 }));
      mockDb.select.mockReturnValueOnce(limitChain([roleRow({ position: 3 })]));

      await expect(service.deleteRole('s1', 'r1', 'u1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reorderRoles', () => {
    it('assigns descending positions and returns the refreshed list', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ isOwner: true }));
      const rows = [roleRow({ id: 'r1', position: 1 }), roleRow({ id: 'r2', position: 2 })];
      mockDb.select
        .mockReturnValueOnce(whereChain(rows))
        .mockReturnValueOnce(orderByChain([roleRow({ id: 'r1', position: 3 })]));
      const set = jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });
      mockDb.update.mockReturnValue({ set });

      const result = await service.reorderRoles('s1', 'u1', ['r1', 'r2']);

      expect(set).toHaveBeenNthCalledWith(1, { position: 3 });
      expect(set).toHaveBeenNthCalledWith(2, { position: 2 });
      expect(result).toHaveLength(1);
    });

    it('throws NotFoundException when a role does not belong to the server', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ isOwner: true }));
      mockDb.select.mockReturnValueOnce(whereChain([roleRow({ id: 'r1' })]));

      await expect(service.reorderRoles('s1', 'u1', ['r1', 'r2'])).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException when @everyone is part of the reorder', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ isOwner: true }));
      mockDb.select.mockReturnValueOnce(whereChain([roleRow({ id: 'r1', isEveryone: true })]));

      await expect(service.reorderRoles('s1', 'u1', ['r1'])).rejects.toThrow(ConflictException);
    });

    it('refuses reordering a role ranked at or above the requester', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ topPosition: 2 }));
      mockDb.select.mockReturnValueOnce(whereChain([roleRow({ id: 'r1', position: 4 })]));

      await expect(service.reorderRoles('s1', 'u1', ['r1'])).rejects.toThrow(ForbiddenException);
    });

    it('refuses reordering when the requester has no room below its highest role', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ topPosition: 1 }));
      mockDb.select.mockReturnValueOnce(whereChain([roleRow({ id: 'r1', position: 0 })]));

      await expect(service.reorderRoles('s1', 'u1', ['r1'])).rejects.toThrow(ForbiddenException);
    });
  });

  describe('setMemberRoles', () => {
    it('adds the missing roles and removes the dropped ones', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ isOwner: true }));
      mockDb.select
        .mockReturnValueOnce(limitChain([{ id: 'target-m' }]))
        .mockReturnValueOnce(limitChain([{ ownerId: 'owner' }]))
        .mockReturnValueOnce(whereChain([roleRow({ id: 'r2', position: 2 })]))
        .mockReturnValueOnce(joinChain([{ roleId: 'r1', position: 1 }]));
      const deleteWhere = jest.fn().mockResolvedValue(undefined);
      mockDb.delete.mockReturnValue({ where: deleteWhere });
      const insertValues = jest.fn().mockResolvedValue(undefined);
      mockDb.insert.mockReturnValue({ values: insertValues });

      const result = await service.setMemberRoles('s1', 'u2', 'u1', { roleIds: ['r2'] });

      expect(result).toEqual(['r2']);
      expect(deleteWhere).toHaveBeenCalled();
      expect(insertValues).toHaveBeenCalledWith([{ memberId: 'target-m', roleId: 'r2' }]);
    });

    it('clears every role when the desired list is empty', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ isOwner: true }));
      mockDb.select
        .mockReturnValueOnce(limitChain([{ id: 'target-m' }]))
        .mockReturnValueOnce(limitChain([{ ownerId: 'owner' }]))
        .mockReturnValueOnce(joinChain([{ roleId: 'r1', position: 1 }]));
      mockDb.delete.mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });

      await expect(service.setMemberRoles('s1', 'u2', 'u1', { roleIds: [] })).resolves.toEqual([]);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('refuses a requester without ManageRoles', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ permissions: 0 }));

      await expect(service.setMemberRoles('s1', 'u2', 'u1', { roleIds: [] })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when the target is not a member', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ isOwner: true }));
      mockDb.select.mockReturnValueOnce(limitChain([]));

      await expect(service.setMemberRoles('s1', 'u2', 'u1', { roleIds: [] })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('refuses changing the server owner roles', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ isOwner: true }));
      mockDb.select
        .mockReturnValueOnce(limitChain([{ id: 'target-m' }]))
        .mockReturnValueOnce(limitChain([{ ownerId: 'u2' }]));

      await expect(service.setMemberRoles('s1', 'u2', 'u1', { roleIds: [] })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when a desired role does not exist', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ isOwner: true }));
      mockDb.select
        .mockReturnValueOnce(limitChain([{ id: 'target-m' }]))
        .mockReturnValueOnce(limitChain([{ ownerId: 'owner' }]))
        .mockReturnValueOnce(whereChain([]));

      await expect(
        service.setMemberRoles('s1', 'u2', 'u1', { roleIds: ['ghost'] }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when @everyone is explicitly assigned', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ isOwner: true }));
      mockDb.select
        .mockReturnValueOnce(limitChain([{ id: 'target-m' }]))
        .mockReturnValueOnce(limitChain([{ ownerId: 'owner' }]))
        .mockReturnValueOnce(whereChain([roleRow({ id: 'everyone', isEveryone: true })]));

      await expect(
        service.setMemberRoles('s1', 'u2', 'u1', { roleIds: ['everyone'] }),
      ).rejects.toThrow(ConflictException);
    });

    it('refuses assigning a role ranked at or above the requester', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ topPosition: 2 }));
      mockDb.select
        .mockReturnValueOnce(limitChain([{ id: 'target-m' }]))
        .mockReturnValueOnce(limitChain([{ ownerId: 'owner' }]))
        .mockReturnValueOnce(whereChain([roleRow({ id: 'r9', position: 4 })]));

      await expect(service.setMemberRoles('s1', 'u2', 'u1', { roleIds: ['r9'] })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('refuses removing a role the requester does not outrank', async () => {
      jest.spyOn(service, 'resolveAuthz').mockResolvedValue(authz({ topPosition: 3 }));
      mockDb.select
        .mockReturnValueOnce(limitChain([{ id: 'target-m' }]))
        .mockReturnValueOnce(limitChain([{ ownerId: 'owner' }]))
        .mockReturnValueOnce(joinChain([{ roleId: 'r9', position: 8 }]));

      await expect(service.setMemberRoles('s1', 'u2', 'u1', { roleIds: [] })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getRoleIdsForMember', () => {
    it('returns the assigned role ids', async () => {
      mockDb.select.mockReturnValueOnce(whereChain([{ roleId: 'r1' }, { roleId: 'r2' }]));

      await expect(service.getRoleIdsForMember('m1')).resolves.toEqual(['r1', 'r2']);
    });

    it('propagates a database failure', async () => {
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockRejectedValue(new Error('connection lost')),
      });

      await expect(service.getRoleIdsForMember('m1')).rejects.toThrow('connection lost');
    });
  });

  describe('resolveAuthzMap', () => {
    it('throws NotFoundException when the server does not exist', async () => {
      mockDb.select.mockReturnValueOnce(limitChain([]));

      await expect(service.resolveAuthzMap('s1')).rejects.toThrow(NotFoundException);
    });

    it('gives the owner every permission and ORs @everyone for the others', async () => {
      mockDb.select
        .mockReturnValueOnce(limitChain([{ ownerId: 'u1' }]))
        .mockReturnValueOnce(
          whereChain([
            { id: 'm1', userId: 'u1' },
            { id: 'm2', userId: 'u2' },
          ]),
        )
        .mockReturnValueOnce(limitChain([{ permissions: PERMISSIONS.ViewChannels }]))
        .mockReturnValueOnce(
          joinChain([{ memberId: 'm2', roleId: 'r1', permissions: PERMISSIONS.ManageRoles }]),
        );

      const result = await service.resolveAuthzMap('s1');

      expect(result.get('m1')).toEqual({
        roleIds: [],
        permissions: ALL_PERMISSIONS,
        isOwner: true,
      });
      expect(result.get('m2')).toEqual({
        roleIds: ['r1'],
        permissions: PERMISSIONS.ViewChannels | PERMISSIONS.ManageRoles,
        isOwner: false,
      });
    });

    it('returns an empty map and skips the assignment query when the server has no member', async () => {
      const assignments = joinChain([]);
      mockDb.select
        .mockReturnValueOnce(limitChain([{ ownerId: 'u1' }]))
        .mockReturnValueOnce(whereChain([]))
        .mockReturnValueOnce(limitChain([]))
        .mockReturnValueOnce(assignments);

      const result = await service.resolveAuthzMap('s1');

      expect(result.size).toBe(0);
      expect(assignments.from).not.toHaveBeenCalled();
    });
  });
});

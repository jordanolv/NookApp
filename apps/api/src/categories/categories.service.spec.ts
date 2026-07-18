import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PERMISSIONS } from '@nookapp/protocol';
import { DB } from '../database/database.module';
import { RolesService } from '../roles/roles.service';
import { CategoriesService } from './categories.service';

const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockRolesService = {
  resolveAuthz: jest.fn(),
};

function memberChain(rows: { id: string }[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(rows),
  };
}

function categoryRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'cat1',
    serverId: 's1',
    name: 'General',
    position: 0,
    color: null,
    iconUrl: null,
    bannerUrl: null,
    createdAt: new Date('2025-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function authz(overrides: Partial<{ isOwner: boolean; permissions: number }> = {}) {
  return {
    memberId: 'm1',
    isOwner: false,
    permissions: 0,
    roleIds: [],
    topPosition: 0,
    ...overrides,
  };
}

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: DB, useValue: mockDb },
        { provide: RolesService, useValue: mockRolesService },
      ],
    }).compile();
    service = module.get(CategoriesService);
  });

  describe('listCategories', () => {
    it('returns categories ordered by position', async () => {
      const rows = [categoryRow(), categoryRow({ id: 'cat2', name: 'Voice', position: 1 })];
      const listChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(rows),
      };
      mockDb.select.mockReturnValueOnce(memberChain([{ id: 'm1' }])).mockReturnValueOnce(listChain);

      const result = await service.listCategories('s1', 'u1');
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'cat1',
        serverId: 's1',
        name: 'General',
        position: 0,
        color: null,
        iconUrl: null,
        bannerUrl: null,
        createdAt: '2025-01-01T00:00:00.000Z',
      });
      expect(listChain.orderBy).toHaveBeenCalled();
    });

    it('refuses a user who is not a member of the server', async () => {
      mockDb.select.mockReturnValueOnce(memberChain([]));

      await expect(service.listCategories('s1', 'outsider')).rejects.toThrow(ForbiddenException);
      // Membership check must short-circuit before any category read.
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });
  });

  describe('createCategory', () => {
    it('appends after the last position when none is given', async () => {
      mockRolesService.resolveAuthz.mockResolvedValue(
        authz({ permissions: PERMISSIONS.ManageChannels }),
      );
      const positionsChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([{ position: 0 }, { position: 4 }]),
      };
      mockDb.select.mockReturnValueOnce(positionsChain);
      const insertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([categoryRow({ id: 'cat3', position: 5 })]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      const result = await service.createCategory('s1', 'u1', { name: 'General' });
      expect(result.position).toBe(5);
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ serverId: 's1', name: 'General', position: 5 }),
      );
    });

    it('starts at position 0 on an empty server', async () => {
      mockRolesService.resolveAuthz.mockResolvedValue(authz({ isOwner: true }));
      const positionsChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValueOnce(positionsChain);
      const insertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([categoryRow()]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      await service.createCategory('s1', 'u1', { name: 'General' });
      expect(insertChain.values).toHaveBeenCalledWith(expect.objectContaining({ position: 0 }));
    });

    it('uses the explicit position without querying siblings', async () => {
      mockRolesService.resolveAuthz.mockResolvedValue(authz({ isOwner: true }));
      const insertChain = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([categoryRow({ position: 2 })]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      const result = await service.createCategory('s1', 'u1', { name: 'General', position: 2 });
      expect(result.position).toBe(2);
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('refuses a member without ManageChannels permission', async () => {
      mockRolesService.resolveAuthz.mockResolvedValue(authz());

      await expect(service.createCategory('s1', 'u1', { name: 'General' })).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('updateCategory', () => {
    it('persists only the provided fields', async () => {
      mockRolesService.resolveAuthz.mockResolvedValue(
        authz({ permissions: PERMISSIONS.ManageChannels }),
      );
      const updateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([categoryRow({ name: 'Renamed', color: '#fff' })]),
      };
      mockDb.update.mockReturnValue(updateChain);

      const result = await service.updateCategory('s1', 'cat1', 'u1', {
        name: 'Renamed',
        color: '#fff',
      });
      expect(result.name).toBe('Renamed');
      expect(result.color).toBe('#fff');
      expect(updateChain.set).toHaveBeenCalledWith({ name: 'Renamed', color: '#fff' });
    });

    it('throws NotFoundException when the category belongs to another server', async () => {
      mockRolesService.resolveAuthz.mockResolvedValue(authz({ isOwner: true }));
      // The serverId-scoped where clause matches nothing for a foreign category.
      const updateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      };
      mockDb.update.mockReturnValue(updateChain);

      await expect(
        service.updateCategory('s1', 'cat-of-s2', 'u1', { name: 'Hijacked' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('refuses a member without ManageChannels permission', async () => {
      mockRolesService.resolveAuthz.mockResolvedValue(authz());

      await expect(service.updateCategory('s1', 'cat1', 'u1', { name: 'x' })).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteCategory', () => {
    it('deletes an existing category', async () => {
      mockRolesService.resolveAuthz.mockResolvedValue(
        authz({ permissions: PERMISSIONS.ManageChannels }),
      );
      const deleteChain = {
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([categoryRow()]),
      };
      mockDb.delete.mockReturnValue(deleteChain);

      await expect(service.deleteCategory('s1', 'cat1', 'u1')).resolves.toBeUndefined();
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('throws NotFoundException when the category belongs to another server', async () => {
      mockRolesService.resolveAuthz.mockResolvedValue(authz({ isOwner: true }));
      const deleteChain = {
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      };
      mockDb.delete.mockReturnValue(deleteChain);

      await expect(service.deleteCategory('s1', 'cat-of-s2', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('refuses a member without ManageChannels permission', async () => {
      mockRolesService.resolveAuthz.mockResolvedValue(authz());

      await expect(service.deleteCategory('s1', 'cat1', 'u1')).rejects.toThrow(ForbiddenException);
      expect(mockDb.delete).not.toHaveBeenCalled();
    });
  });
});

import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DEFAULT_MAP, PERMISSIONS, type MapData } from '@nookapp/protocol';
import { DB } from '../database/database.module';
import { RolesService } from '../roles/roles.service';
import { MapsService } from './maps.service';

const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
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

function mapChain(rows: unknown[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(rows),
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

const sampleData: MapData = {
  width: 50,
  height: 50,
  spawn: { x: 10, y: 10 },
  layers: {
    floors: [{ x: 1, y: 1, asset: 'office_floor_light' }],
    walls: [],
    decor: [],
    collision: [],
  },
};

describe('MapsService', () => {
  let service: MapsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        MapsService,
        { provide: DB, useValue: mockDb },
        { provide: RolesService, useValue: mockRolesService },
      ],
    }).compile();
    service = module.get(MapsService);
  });

  describe('getMap', () => {
    it('returns the stored map for a member', async () => {
      const updatedAt = new Date('2025-03-01T12:00:00.000Z');
      mockDb.select
        .mockReturnValueOnce(memberChain([{ id: 'm1' }]))
        .mockReturnValueOnce(mapChain([{ serverId: 's1', data: sampleData, updatedAt }]));

      const result = await service.getMap('s1', 'u1');
      expect(result.serverId).toBe('s1');
      expect(result.data).toEqual(sampleData);
      expect(result.updatedAt).toBe('2025-03-01T12:00:00.000Z');
    });

    it('falls back to the default map when the server has none yet', async () => {
      mockDb.select
        .mockReturnValueOnce(memberChain([{ id: 'm1' }]))
        .mockReturnValueOnce(mapChain([]));

      const result = await service.getMap('s1', 'u1');
      expect(result.data).toEqual(DEFAULT_MAP);
      expect(result.updatedAt).toBe(new Date(0).toISOString());
    });

    it('falls back to the default map when stored data fails validation', async () => {
      mockDb.select.mockReturnValueOnce(memberChain([{ id: 'm1' }])).mockReturnValueOnce(
        mapChain([
          {
            serverId: 's1',
            data: { width: 'not-a-number' },
            updatedAt: new Date('2025-03-01T12:00:00.000Z'),
          },
        ]),
      );

      const result = await service.getMap('s1', 'u1');
      expect(result.data).toEqual(DEFAULT_MAP);
    });

    it('drops non-array layer rows instead of rejecting the whole map', async () => {
      mockDb.select.mockReturnValueOnce(memberChain([{ id: 'm1' }])).mockReturnValueOnce(
        mapChain([
          {
            serverId: 's1',
            data: { ...sampleData, layers: { ...sampleData.layers, decor: 'corrupted' } },
            updatedAt: new Date('2025-03-01T12:00:00.000Z'),
          },
        ]),
      );

      const result = await service.getMap('s1', 'u1');
      expect(result.data.layers.decor).toEqual([]);
      expect(result.data.layers.floors).toEqual(sampleData.layers.floors);
    });

    it('refuses a user who is not a member of the server', async () => {
      mockDb.select.mockReturnValueOnce(memberChain([]));

      await expect(service.getMap('s1', 'outsider')).rejects.toThrow(ForbiddenException);
      // Membership check must short-circuit before the map read.
      expect(mockDb.select).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveMap', () => {
    it('upserts the map for a user holding ManageMap', async () => {
      mockRolesService.resolveAuthz.mockResolvedValue(
        authz({ permissions: PERMISSIONS.ManageMap }),
      );
      const insertChain = {
        values: jest.fn().mockReturnThis(),
        onConflictDoUpdate: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([
          {
            serverId: 's1',
            data: sampleData,
            updatedAt: new Date('2025-03-02T09:00:00.000Z'),
          },
        ]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      const result = await service.saveMap('s1', 'u1', sampleData);
      expect(result.data).toEqual(sampleData);
      expect(result.updatedAt).toBe('2025-03-02T09:00:00.000Z');
      expect(insertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({ serverId: 's1', data: sampleData }),
      );
      expect(insertChain.onConflictDoUpdate).toHaveBeenCalled();
    });

    it('allows the server owner regardless of permission flags', async () => {
      mockRolesService.resolveAuthz.mockResolvedValue(authz({ isOwner: true }));
      const insertChain = {
        values: jest.fn().mockReturnThis(),
        onConflictDoUpdate: jest.fn().mockReturnThis(),
        returning: jest
          .fn()
          .mockResolvedValue([{ serverId: 's1', data: sampleData, updatedAt: new Date(0) }]),
      };
      mockDb.insert.mockReturnValue(insertChain);

      await expect(service.saveMap('s1', 'owner', sampleData)).resolves.toBeDefined();
    });

    it('refuses a member without ManageMap permission', async () => {
      mockRolesService.resolveAuthz.mockResolvedValue(authz());

      await expect(service.saveMap('s1', 'u1', sampleData)).rejects.toThrow(ForbiddenException);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('scopes authorization to the target server', async () => {
      mockRolesService.resolveAuthz.mockResolvedValue(authz());

      await expect(service.saveMap('s2', 'u1', sampleData)).rejects.toThrow(ForbiddenException);
      expect(mockRolesService.resolveAuthz).toHaveBeenCalledWith('s2', 'u1');
    });
  });
});

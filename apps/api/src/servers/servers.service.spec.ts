import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DB } from '../database/database.module';
import { RolesService } from '../roles/roles.service';
import { ServersService } from './servers.service';

const mockDb = {
  insert: jest.fn(),
  select: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockRoles = {
  ensureEveryoneRole: jest.fn(),
  resolveAuthz: jest.fn(),
};

describe('ServersService', () => {
  let service: ServersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ServersService,
        { provide: DB, useValue: mockDb },
        { provide: RolesService, useValue: mockRoles },
      ],
    }).compile();
    service = module.get(ServersService);
  });

  describe('listMyServers', () => {
    it('returns servers where the user is a member', async () => {
      const row = {
        server: {
          id: 's1',
          slug: 'my-server-aa',
          name: 'My Server',
          ownerId: 'u1',
          iconUrl: null,
          createdAt: new Date('2025-01-01'),
        },
      };
      const selectChain = {
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([row]),
      };
      mockDb.select.mockReturnValue(selectChain);

      const result = await service.listMyServers('u1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('s1');
    });
  });

  describe('joinViaInvite', () => {
    it('throws NotFoundException when invite code is unknown', async () => {
      const chain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(chain);

      await expect(service.joinViaInvite('BADCODE', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when user is already a member', async () => {
      const invite = {
        id: 'inv1',
        serverId: 's1',
        code: 'ABC123',
        maxUses: null,
        uses: 0,
        expiresAt: null,
        createdAt: new Date(),
      };
      let callCount = 0;
      const chain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation(() => {
          callCount++;
          return Promise.resolve(callCount === 1 ? [invite] : [{ id: 'm1' }]);
        }),
      };
      mockDb.select.mockReturnValue(chain);

      await expect(service.joinViaInvite('ABC123', 'u1')).rejects.toThrow(ConflictException);
    });
  });

  describe('deleteServer', () => {
    it('throws ForbiddenException when user is not owner', async () => {
      const chain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ ownerId: 'someone-else' }]),
      };
      mockDb.select.mockReturnValue(chain);

      await expect(service.deleteServer('s1', 'u2')).rejects.toThrow(ForbiddenException);
    });
  });
});

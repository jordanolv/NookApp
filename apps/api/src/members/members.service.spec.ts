import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DB } from '../database/database.module';
import { MembersService } from './members.service';

const mockDb = {
  select: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('MembersService', () => {
  let service: MembersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [MembersService, { provide: DB, useValue: mockDb }],
    }).compile();
    service = module.get(MembersService);
  });

  describe('listMembers', () => {
    it('throws ForbiddenException when user is not a member', async () => {
      const chain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(chain);

      await expect(service.listMembers('s1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('returns members for a valid member', async () => {
      const memberRow = {
        id: 'm1',
        serverId: 's1',
        userId: 'u1',
        role: 'owner',
        joinedAt: new Date(),
      };
      const requireChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'm1' }]),
      };
      const listChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([memberRow]),
      };
      mockDb.select.mockReturnValueOnce(requireChain).mockReturnValueOnce(listChain);

      const result = await service.listMembers('s1', 'u1');
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('u1');
    });
  });

  describe('kickMember', () => {
    it('throws ForbiddenException when requester is a plain member', async () => {
      const chain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ role: 'member' }]),
      };
      mockDb.select.mockReturnValue(chain);

      await expect(service.kickMember('s1', 'u2', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when trying to kick the owner', async () => {
      let call = 0;
      const chain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation(() => {
          call++;
          return Promise.resolve(call === 1 ? [{ role: 'admin' }] : [{ role: 'owner' }]);
        }),
      };
      mockDb.select.mockReturnValue(chain);

      await expect(service.kickMember('s1', 'u2', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when target is not a member', async () => {
      let call = 0;
      const chain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation(() => {
          call++;
          return Promise.resolve(call === 1 ? [{ role: 'owner' }] : []);
        }),
      };
      mockDb.select.mockReturnValue(chain);

      await expect(service.kickMember('s1', 'u2', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateMember', () => {
    it('throws ForbiddenException when owner role change is attempted', async () => {
      let call = 0;
      const chain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation(() => {
          call++;
          return Promise.resolve(call === 1 ? [{ role: 'admin' }] : [{ role: 'owner' }]);
        }),
      };
      mockDb.select.mockReturnValue(chain);

      await expect(service.updateMember('s1', 'u2', 'u1', { role: 'member' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});

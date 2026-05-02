import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DB } from '../database/database.module';
import { ChannelsService } from './channels.service';

const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

describe('ChannelsService', () => {
  let service: ChannelsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [ChannelsService, { provide: DB, useValue: mockDb }],
    }).compile();
    service = module.get(ChannelsService);
  });

  describe('listChannels', () => {
    it('throws ForbiddenException when user is not a member', async () => {
      const chain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(chain);

      await expect(service.listChannels('s1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('returns channels ordered by position', async () => {
      let callCount = 0;
      const memberRow = [{ id: 'm1' }];
      const channelRows = [
        {
          id: 'c1',
          serverId: 's1',
          type: 'text',
          name: 'general',
          position: 0,
          parentId: null,
          createdAt: new Date('2025-01-01'),
        },
      ];
      const chain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation(() => Promise.resolve(memberRow)),
        orderBy: jest.fn().mockImplementation(() => {
          callCount++;
          return Promise.resolve(callCount === 1 ? memberRow : channelRows);
        }),
      };
      mockDb.select.mockReturnValue(chain);

      // first select = requireMember, second = list channels
      const memberChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(memberRow),
      };
      const channelChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(channelRows),
      };
      mockDb.select.mockReturnValueOnce(memberChain).mockReturnValueOnce(channelChain);

      const result = await service.listChannels('s1', 'u1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('general');
    });
  });

  describe('createChannel', () => {
    it('throws ForbiddenException when user is a plain member', async () => {
      const chain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ role: 'member' }]),
      };
      mockDb.select.mockReturnValue(chain);

      await expect(
        service.createChannel('s1', 'u1', { name: 'new', type: 'text' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateChannel', () => {
    it('throws NotFoundException when channel does not belong to server', async () => {
      const memberChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ role: 'owner' }]),
      };
      const updateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(memberChain);
      mockDb.update.mockReturnValue(updateChain);

      await expect(
        service.updateChannel('s1', 'c-wrong', 'u1', { name: 'renamed' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

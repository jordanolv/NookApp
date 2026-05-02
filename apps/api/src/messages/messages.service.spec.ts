import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DB } from '../database/database.module';
import { MessagesService } from './messages.service';

const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
};

describe('MessagesService', () => {
  let service: MessagesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [MessagesService, { provide: DB, useValue: mockDb }],
    }).compile();
    service = module.get(MessagesService);
  });

  describe('listMessages', () => {
    it('throws ForbiddenException when channel does not belong to server', async () => {
      const chain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(chain);

      await expect(service.listMessages('s1', 'c1', 'u1', {})).rejects.toThrow(ForbiddenException);
    });

    it('returns messages in chronological order', async () => {
      const msgs = [
        {
          id: 'm2',
          channelId: 'c1',
          authorId: 'u1',
          content: 'hello',
          createdAt: new Date('2025-01-02'),
          editedAt: null,
        },
        {
          id: 'm1',
          channelId: 'c1',
          authorId: 'u1',
          content: 'world',
          createdAt: new Date('2025-01-01'),
          editedAt: null,
        },
      ];
      const channelChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'c1' }]),
      };
      const memberChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'm1' }]),
      };
      const msgsChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(msgs),
      };
      mockDb.select
        .mockReturnValueOnce(channelChain)
        .mockReturnValueOnce(memberChain)
        .mockReturnValueOnce(msgsChain);

      const result = await service.listMessages('s1', 'c1', 'u1', {});
      // reversed: oldest first
      expect(result[0].id).toBe('m1');
      expect(result[1].id).toBe('m2');
    });
  });

  describe('createMessage', () => {
    it('throws ForbiddenException when user is not a member', async () => {
      const channelChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'c1' }]),
      };
      const memberChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValueOnce(channelChain).mockReturnValueOnce(memberChain);

      await expect(service.createMessage('s1', 'c1', 'u1', { content: 'hi' })).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PERMISSIONS } from '@nookapp/protocol';
import { DB } from '../database/database.module';
import { RolesService } from '../roles/roles.service';
import { MessagesService } from './messages.service';

const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockRolesService = {
  resolveAuthz: jest.fn(),
};

function memberOkChains() {
  // channel-belongs + member-exists chains used by requireChannelMember
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
  return { channelChain, memberChain };
}

describe('MessagesService', () => {
  let service: MessagesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        MessagesService,
        { provide: DB, useValue: mockDb },
        { provide: RolesService, useValue: mockRolesService },
      ],
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

  describe('updateMessage', () => {
    it('throws ForbiddenException when editing someone else message', async () => {
      const { channelChain, memberChain } = memberOkChains();
      const msgChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'm1', channelId: 'c1', authorId: 'other' }]),
      };
      mockDb.select
        .mockReturnValueOnce(channelChain)
        .mockReturnValueOnce(memberChain)
        .mockReturnValueOnce(msgChain);

      await expect(
        service.updateMessage('s1', 'c1', 'm1', 'u1', { content: 'edited' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when message is missing', async () => {
      const { channelChain, memberChain } = memberOkChains();
      const msgChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockDb.select
        .mockReturnValueOnce(channelChain)
        .mockReturnValueOnce(memberChain)
        .mockReturnValueOnce(msgChain);

      await expect(
        service.updateMessage('s1', 'c1', 'm1', 'u1', { content: 'edited' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteMessage', () => {
    it('allows a non-author with ManageMessages permission', async () => {
      const { channelChain, memberChain } = memberOkChains();
      const msgChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'm1', channelId: 'c1', authorId: 'other' }]),
      };
      mockDb.select
        .mockReturnValueOnce(channelChain)
        .mockReturnValueOnce(memberChain)
        .mockReturnValueOnce(msgChain);
      mockRolesService.resolveAuthz.mockResolvedValue({
        isOwner: false,
        permissions: PERMISSIONS.ManageMessages,
      });
      const deleteChain = { where: jest.fn().mockResolvedValue(undefined) };
      mockDb.delete.mockReturnValue(deleteChain);

      await expect(service.deleteMessage('s1', 'c1', 'm1', 'u1')).resolves.toBeUndefined();
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it('forbids a non-author without ManageMessages permission', async () => {
      const { channelChain, memberChain } = memberOkChains();
      const msgChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ id: 'm1', channelId: 'c1', authorId: 'other' }]),
      };
      mockDb.select
        .mockReturnValueOnce(channelChain)
        .mockReturnValueOnce(memberChain)
        .mockReturnValueOnce(msgChain);
      mockRolesService.resolveAuthz.mockResolvedValue({ isOwner: false, permissions: 0 });

      await expect(service.deleteMessage('s1', 'c1', 'm1', 'u1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DB } from '../database/database.module';
import { DmsService } from './dms.service';

const mockDb = {
  select: jest.fn(),
  selectDistinct: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

interface DbChain {
  from: jest.Mock;
  innerJoin: jest.Mock;
  where: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  values: jest.Mock;
  set: jest.Mock;
  returning: jest.Mock;
  then: (resolve: (rows: unknown[]) => unknown) => Promise<unknown>;
}

// Drizzle builders are awaitable at any point in the chain, so the fake is thenable
// too: every method returns itself and awaiting anywhere yields `rows`.
function chain(rows: unknown[] = []): DbChain {
  const c = {} as DbChain;
  const methods = [
    'from',
    'innerJoin',
    'where',
    'orderBy',
    'limit',
    'values',
    'set',
    'returning',
  ] as const;
  for (const m of methods) c[m] = jest.fn(() => c);
  c.then = (resolve) => Promise.resolve(rows).then(resolve);
  return c;
}

const OTHER_USER = { id: 'u2', name: 'Bob', username: 'bob', avatarUrl: null };

// The five selects buildSummary() issues, in order: self participant, conversation,
// other participant, last message, unread count.
function summaryChains(opts: { lastMessageAt: Date; last?: unknown; unread?: number }): DbChain[] {
  return [
    chain([{ lastReadAt: null }]),
    chain([{ lastMessageAt: opts.lastMessageAt, createdAt: new Date('2025-01-01T00:00:00.000Z') }]),
    chain([OTHER_USER]),
    chain(opts.last ? [opts.last] : []),
    chain([{ total: opts.unread ?? 0 }]),
  ];
}

function queueSelects(chains: DbChain[]) {
  const queue = [...chains];
  mockDb.select.mockImplementation(() => queue.shift() ?? chain());
}

describe('DmsService', () => {
  let service: DmsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [DmsService, { provide: DB, useValue: mockDb }],
    }).compile();
    service = module.get(DmsService);
  });

  describe('openConversation', () => {
    it('refuses opening a conversation with yourself', async () => {
      await expect(service.openConversation('u1', 'u1')).rejects.toThrow(ForbiddenException);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the recipient does not exist', async () => {
      queueSelects([chain([])]);

      await expect(service.openConversation('u1', 'ghost')).rejects.toThrow(NotFoundException);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('reuses the existing conversation between the two users', async () => {
      queueSelects([
        chain([{ id: 'u2' }]),
        chain([{ conversationId: 'conv1' }]),
        chain([
          { conversationId: 'conv1', userId: 'u1' },
          { conversationId: 'conv1', userId: 'u2' },
        ]),
        ...summaryChains({ lastMessageAt: new Date('2025-02-01T00:00:00.000Z') }),
      ]);

      const result = await service.openConversation('u1', 'u2');
      expect(result.id).toBe('conv1');
      expect(result.otherUser.id).toBe('u2');
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('creates the conversation and both participants when none exists', async () => {
      queueSelects([
        chain([{ id: 'u2' }]),
        chain([]),
        ...summaryChains({ lastMessageAt: new Date('2025-02-01T00:00:00.000Z') }),
      ]);
      mockDb.insert.mockImplementation(() => chain());

      const result = await service.openConversation('u1', 'u2');
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
      expect(result.unreadCount).toBe(0);
    });

    it('rejects a conversation the requester is not part of', async () => {
      queueSelects([
        chain([{ id: 'u2' }]),
        chain([{ conversationId: 'conv1' }]),
        chain([
          { conversationId: 'conv1', userId: 'u1' },
          { conversationId: 'conv1', userId: 'u2' },
        ]),
        chain([]),
      ]);

      await expect(service.openConversation('u1', 'u2')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listConversations', () => {
    it('returns summaries sorted by last message, most recent first', async () => {
      const a = summaryChains({ lastMessageAt: new Date('2025-01-05T00:00:00.000Z') });
      const b = summaryChains({ lastMessageAt: new Date('2025-03-05T00:00:00.000Z') });
      // Promise.all interleaves both buildSummary() calls step by step.
      queueSelects([
        chain([{ conversationId: 'conv-a' }, { conversationId: 'conv-b' }]),
        ...a.flatMap((c, i) => [c, b[i]]),
      ]);

      const result = await service.listConversations('u1');
      expect(result.map((c) => c.id)).toEqual(['conv-b', 'conv-a']);
    });

    it('propagates NotFoundException when a conversation row is missing', async () => {
      queueSelects([
        chain([{ conversationId: 'conv-a' }]),
        chain([{ lastReadAt: null }]),
        chain([]),
      ]);

      await expect(service.listConversations('u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listCandidates', () => {
    it('maps members of shared servers and defaults a missing avatar to null', async () => {
      mockDb.select.mockReturnValue(chain([]));
      mockDb.selectDistinct.mockReturnValue(
        chain([{ id: 'u2', name: 'Bob', username: 'bob', avatarUrl: undefined }]),
      );

      const result = await service.listCandidates('u1');
      expect(result).toEqual([{ id: 'u2', name: 'Bob', username: 'bob', avatarUrl: null }]);
    });

    it('returns an empty list when the user shares no server', async () => {
      mockDb.select.mockReturnValue(chain([]));
      mockDb.selectDistinct.mockReturnValue(chain([]));

      await expect(service.listCandidates('u1')).resolves.toEqual([]);
    });
  });

  describe('lookupByUsername', () => {
    it('normalizes the handle and returns the user', async () => {
      const c = chain([OTHER_USER]);
      mockDb.select.mockReturnValue(c);

      const result = await service.lookupByUsername('  BoB  ', 'u1');
      expect(result.username).toBe('bob');
      expect(c.from).toHaveBeenCalled();
    });

    it('throws NotFoundException when the username is unknown', async () => {
      mockDb.select.mockReturnValue(chain([]));

      await expect(service.lookupByUsername('ghost', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when looking up yourself', async () => {
      mockDb.select.mockReturnValue(chain([{ ...OTHER_USER, id: 'u1' }]));

      await expect(service.lookupByUsername('bob', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listMessages', () => {
    it('refuses to read a conversation the user is not a participant of', async () => {
      queueSelects([chain([])]);

      await expect(service.listMessages('conv1', 'intruder', {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('returns messages in chronological order', async () => {
      const rows = [
        {
          id: 'm2',
          conversationId: 'conv1',
          authorId: 'u1',
          content: 'second',
          createdAt: new Date('2025-01-02T00:00:00.000Z'),
          editedAt: null,
        },
        {
          id: 'm1',
          conversationId: 'conv1',
          authorId: 'u2',
          content: 'first',
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
          editedAt: null,
        },
      ];
      queueSelects([chain([{ id: 'p1' }]), chain(rows)]);

      const result = await service.listMessages('conv1', 'u1', {});
      expect(result.map((m) => m.id)).toEqual(['m1', 'm2']);
    });

    it('caps the requested limit at 100', async () => {
      const msgs = chain([]);
      queueSelects([chain([{ id: 'p1' }]), msgs]);

      await service.listMessages('conv1', 'u1', { limit: 500 });
      expect(msgs.limit).toHaveBeenCalledWith(100);
    });
  });

  describe('createMessage', () => {
    it('refuses to write into a conversation the user is not a participant of', async () => {
      queueSelects([chain([])]);

      await expect(service.createMessage('conv1', 'intruder', { content: 'hi' })).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('persists the message and returns the participant ids', async () => {
      queueSelects([chain([{ id: 'p1' }]), chain([{ userId: 'u1' }, { userId: 'u2' }])]);
      mockDb.insert.mockReturnValue(
        chain([
          {
            id: 'm1',
            conversationId: 'conv1',
            authorId: 'u1',
            content: 'hi',
            createdAt: new Date('2025-01-01T00:00:00.000Z'),
            editedAt: null,
          },
        ]),
      );
      mockDb.update.mockImplementation(() => chain());

      const result = await service.createMessage('conv1', 'u1', { content: 'hi' });
      expect(result.message.content).toBe('hi');
      expect(result.participantIds).toEqual(['u1', 'u2']);
      // conversation lastMessageAt + author lastReadAt
      expect(mockDb.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('markRead', () => {
    it('refuses a user who is not a participant', async () => {
      queueSelects([chain([])]);

      await expect(service.markRead('conv1', 'intruder')).rejects.toThrow(ForbiddenException);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it('updates the participant read cursor', async () => {
      queueSelects([chain([{ id: 'p1' }])]);
      const updateChain = chain();
      mockDb.update.mockReturnValue(updateChain);

      await expect(service.markRead('conv1', 'u1')).resolves.toBeUndefined();
      expect(updateChain.set).toHaveBeenCalledWith({ lastReadAt: expect.any(Date) });
    });
  });
});

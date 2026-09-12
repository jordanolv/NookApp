import { Test } from '@nestjs/testing';
import { DB } from '../database/database.module';
import { UsersService } from './users.service';

const mockTx = {
  select: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockDb = {
  select: jest.fn(),
  update: jest.fn(),
  transaction: jest.fn((cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
};

function ownedServers(rows: { id: string }[]) {
  return { from: jest.fn().mockReturnThis(), where: jest.fn().mockResolvedValue(rows) };
}

function memberLookup(rows: { userId: string }[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(rows),
  };
}

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: DB, useValue: mockDb }],
    }).compile();
    service = module.get(UsersService);
  });

  describe('completeOnboarding', () => {
    it('stamps onboardedAt once and returns the profile', async () => {
      const where = jest.fn().mockResolvedValue(undefined);
      const set = jest.fn().mockReturnValue({ where });
      mockDb.update.mockReturnValue({ set });
      const row = {
        id: 'u1',
        email: 'a@b.co',
        name: 'A',
        username: 'a',
        avatarUrl: null,
        emailVerified: true,
        onboardedAt: new Date('2026-01-01T00:00:00Z'),
        createdAt: new Date('2025-01-01T00:00:00Z'),
      };
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([row]),
      });

      const profile = await service.completeOnboarding('u1');

      expect(set).toHaveBeenCalledWith(expect.objectContaining({ onboardedAt: expect.any(Date) }));
      expect(profile.onboardedAt).toBe('2026-01-01T00:00:00.000Z');
    });
  });

  describe('deleteAccount', () => {
    it('transfers an owned server to the chosen member', async () => {
      mockTx.select
        .mockReturnValueOnce(ownedServers([{ id: 's1' }]))
        .mockReturnValueOnce(memberLookup([{ userId: 'u2' }]));
      const setWhere = { where: jest.fn().mockResolvedValue(undefined) };
      const set = jest.fn().mockReturnValue(setWhere);
      mockTx.update.mockReturnValue({ set });
      mockTx.delete.mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });

      await service.deleteAccount('u1', { transfers: { s1: 'u2' } });

      expect(set).toHaveBeenCalledWith({ ownerId: 'u2' });
      expect(mockTx.delete).toHaveBeenCalledTimes(1); // user only, server kept
    });

    it('deletes an owned server when no transfer target is given', async () => {
      mockTx.select.mockReturnValueOnce(ownedServers([{ id: 's1' }]));
      mockTx.delete.mockReturnValue({ where: jest.fn().mockResolvedValue(undefined) });

      await service.deleteAccount('u1', { transfers: { s1: null } });

      expect(mockTx.update).not.toHaveBeenCalled();
      expect(mockTx.delete).toHaveBeenCalledTimes(2); // server + user
    });

    it('rejects a transfer to a non-member', async () => {
      mockTx.select
        .mockReturnValueOnce(ownedServers([{ id: 's1' }]))
        .mockReturnValueOnce(memberLookup([]));

      await expect(
        service.deleteAccount('u1', { transfers: { s1: 'stranger' } }),
      ).rejects.toThrow();
    });
  });
});

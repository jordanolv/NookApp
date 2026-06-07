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

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PERMISSIONS } from '@nookapp/protocol';
import { DB } from '../database/database.module';
import { RolesService } from '../roles/roles.service';
import { ChannelsService } from './channels.service';

const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockRoles = {
  resolveAuthz: jest.fn(),
};

describe('ChannelsService', () => {
  let service: ChannelsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ChannelsService,
        { provide: DB, useValue: mockDb },
        { provide: RolesService, useValue: mockRoles },
      ],
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
  });

  describe('createChannel', () => {
    it('throws ForbiddenException when user lacks ManageChannels', async () => {
      mockRoles.resolveAuthz.mockResolvedValueOnce({
        memberId: 'm1',
        isOwner: false,
        permissions: 0,
        roleIds: [],
        topPosition: 0,
      });

      await expect(
        service.createChannel('s1', 'u1', { name: 'new', type: 'text' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateChannel', () => {
    it('throws NotFoundException when channel does not belong to server', async () => {
      mockRoles.resolveAuthz.mockResolvedValueOnce({
        memberId: 'm1',
        isOwner: true,
        permissions: PERMISSIONS.ManageChannels,
        roleIds: [],
        topPosition: 0,
      });
      const updateChain = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]),
      };
      mockDb.update.mockReturnValue(updateChain);

      await expect(
        service.updateChannel('s1', 'c-wrong', 'u1', { name: 'renamed' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PERMISSIONS } from '@nookapp/protocol';
import { DB } from '../database/database.module';
import { RolesService } from '../roles/roles.service';
import { MembersService } from './members.service';

const mockDb = {
  select: jest.fn(),
  delete: jest.fn(),
};

const mockRoles = {
  resolveAuthz: jest.fn(),
  resolveAuthzMap: jest.fn(),
};

describe('MembersService', () => {
  let service: MembersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: DB, useValue: mockDb },
        { provide: RolesService, useValue: mockRoles },
      ],
    }).compile();
    service = module.get(MembersService);
  });

  describe('kickMember', () => {
    it('refuses self-kick', async () => {
      await expect(service.kickMember('s1', 'u1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('refuses requester without ManageMembers permission', async () => {
      mockRoles.resolveAuthz.mockResolvedValueOnce({
        memberId: 'm1',
        isOwner: false,
        permissions: 0,
        roleIds: [],
        topPosition: 0,
      });
      await expect(service.kickMember('s1', 'u2', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('refuses kicking the server owner', async () => {
      mockRoles.resolveAuthz.mockResolvedValueOnce({
        memberId: 'm1',
        isOwner: false,
        permissions: PERMISSIONS.ManageMembers,
        roleIds: [],
        topPosition: 5,
      });
      const srvChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ ownerId: 'u2' }]),
      };
      mockDb.select.mockReturnValueOnce(srvChain);

      await expect(service.kickMember('s1', 'u2', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('refuses kicking a member ranked at or above', async () => {
      mockRoles.resolveAuthz
        .mockResolvedValueOnce({
          memberId: 'm1',
          isOwner: false,
          permissions: PERMISSIONS.ManageMembers,
          roleIds: [],
          topPosition: 3,
        })
        .mockResolvedValueOnce({
          memberId: 'm2',
          isOwner: false,
          permissions: 0,
          roleIds: [],
          topPosition: 5,
        });
      const srvChain = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([{ ownerId: 'someone-else' }]),
      };
      mockDb.select.mockReturnValueOnce(srvChain);

      await expect(service.kickMember('s1', 'u2', 'u1')).rejects.toThrow(ForbiddenException);
    });
  });
});

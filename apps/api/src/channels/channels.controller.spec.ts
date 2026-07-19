import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createChannelInputSchema } from '@nookapp/protocol';
import { AuthGuard } from '../auth/auth.guard';
import { ServerScopeGuard } from '../members/server-scope.guard';
import { StorageService } from '../common/storage';
import type { AuthSession } from '../auth/auth.types';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';

const user: AuthSession['user'] = {
  id: 'u1',
  email: 'u1@nookapp.test',
  name: 'User One',
  emailVerified: true,
  createdAt: new Date('2025-01-01'),
};

const mockChannelsService = {
  listChannels: jest.fn(),
  createChannel: jest.fn(),
  updateChannel: jest.fn(),
  deleteChannel: jest.fn(),
  getChannel: jest.fn(),
};

const mockStorage = {
  urlFor: jest.fn(),
  deleteByUrl: jest.fn(),
};

const allowAll = { canActivate: () => true };

describe('ChannelsController', () => {
  let controller: ChannelsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockStorage.deleteByUrl.mockResolvedValue(undefined);
    const module = await Test.createTestingModule({
      controllers: [ChannelsController],
      providers: [
        { provide: ChannelsService, useValue: mockChannelsService },
        { provide: StorageService, useValue: mockStorage },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(allowAll)
      .overrideGuard(ServerScopeGuard)
      .useValue(allowAll)
      .compile();
    controller = module.get(ChannelsController);
  });

  it('lists channels scoped to the server from the path', async () => {
    mockChannelsService.listChannels.mockResolvedValue([]);

    await controller.list(user, 's1');
    expect(mockChannelsService.listChannels).toHaveBeenCalledWith('s1', 'u1');
  });

  it('creates a channel with the server scope and the acting user', async () => {
    // Construit via le vrai schema : le corps recu par le controleur est celui
    // que le ZodPipe a deja normalise, defauts compris.
    const body = createChannelInputSchema.parse({
      name: 'general',
      type: 'text',
      showStat: true,
    });
    mockChannelsService.createChannel.mockResolvedValue({ id: 'c1' });

    await controller.create(user, 's1', body);
    expect(mockChannelsService.createChannel).toHaveBeenCalledWith('s1', 'u1', body);
  });

  it('updates a channel with both path params in the documented order', async () => {
    mockChannelsService.updateChannel.mockResolvedValue({ id: 'c1' });

    await controller.update(user, 's1', 'c1', { name: 'renamed' });
    expect(mockChannelsService.updateChannel).toHaveBeenCalledWith('s1', 'c1', 'u1', {
      name: 'renamed',
    });
  });

  it('deletes a channel with the server scope and the acting user', async () => {
    mockChannelsService.deleteChannel.mockResolvedValue(undefined);

    await controller.remove(user, 's1', 'c1');
    expect(mockChannelsService.deleteChannel).toHaveBeenCalledWith('s1', 'c1', 'u1');
  });

  describe('setIcon', () => {
    it('rejects a request without a file', async () => {
      await expect(controller.setIcon(user, 's1', 'c1', undefined)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockChannelsService.updateChannel).not.toHaveBeenCalled();
    });

    it('stores the new icon and drops the superseded one', async () => {
      mockChannelsService.getChannel.mockResolvedValue({ id: 'c1', iconUrl: '/old.png' });
      mockStorage.urlFor.mockReturnValue('/uploads/channel-icons/new.png');
      mockChannelsService.updateChannel.mockResolvedValue({ id: 'c1' });

      await controller.setIcon(user, 's1', 'c1', { filename: 'new.png' });
      expect(mockStorage.urlFor).toHaveBeenCalledWith('channel-icons', 'new.png');
      expect(mockChannelsService.updateChannel).toHaveBeenCalledWith('s1', 'c1', 'u1', {
        iconUrl: '/uploads/channel-icons/new.png',
      });
      expect(mockStorage.deleteByUrl).toHaveBeenCalledWith('/old.png');
    });

    it('keeps the stored file when the resolved url is unchanged', async () => {
      mockChannelsService.getChannel.mockResolvedValue({ id: 'c1', iconUrl: '/same.png' });
      mockStorage.urlFor.mockReturnValue('/same.png');
      mockChannelsService.updateChannel.mockResolvedValue({ id: 'c1' });

      await controller.setIcon(user, 's1', 'c1', { filename: 'same.png' });
      expect(mockStorage.deleteByUrl).not.toHaveBeenCalled();
    });

    it('does not touch storage when the channel is not readable by the user', async () => {
      mockChannelsService.getChannel.mockRejectedValue(new ForbiddenException());

      await expect(controller.setIcon(user, 's1', 'c1', { filename: 'new.png' })).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockChannelsService.updateChannel).not.toHaveBeenCalled();
    });
  });

  describe('setBanner', () => {
    it('rejects a request without a file', async () => {
      await expect(controller.setBanner(user, 's1', 'c1', undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('stores the new banner and drops the superseded one', async () => {
      mockChannelsService.getChannel.mockResolvedValue({ id: 'c1', bannerUrl: '/old.png' });
      mockStorage.urlFor.mockReturnValue('/uploads/channel-banners/new.png');
      mockChannelsService.updateChannel.mockResolvedValue({ id: 'c1' });

      await controller.setBanner(user, 's1', 'c1', { filename: 'new.png' });
      expect(mockStorage.urlFor).toHaveBeenCalledWith('channel-banners', 'new.png');
      expect(mockChannelsService.updateChannel).toHaveBeenCalledWith('s1', 'c1', 'u1', {
        bannerUrl: '/uploads/channel-banners/new.png',
      });
      expect(mockStorage.deleteByUrl).toHaveBeenCalledWith('/old.png');
    });

    it('keeps the stored file when there was no previous banner', async () => {
      mockChannelsService.getChannel.mockResolvedValue({ id: 'c1', bannerUrl: null });
      mockStorage.urlFor.mockReturnValue('/uploads/channel-banners/new.png');
      mockChannelsService.updateChannel.mockResolvedValue({ id: 'c1' });

      await controller.setBanner(user, 's1', 'c1', { filename: 'new.png' });
      expect(mockStorage.deleteByUrl).not.toHaveBeenCalled();
    });
  });
});

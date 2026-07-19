import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import { ServerScopeGuard } from '../members/server-scope.guard';
import type { AuthSession } from '../auth/auth.types';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { MessageCountsController } from './message-counts.controller';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

const user: AuthSession['user'] = {
  id: 'u1',
  email: 'u1@nookapp.test',
  name: 'User One',
  emailVerified: true,
  createdAt: new Date('2025-01-01'),
};

const mockMessagesService = {
  listMessages: jest.fn(),
  createMessage: jest.fn(),
  updateMessage: jest.fn(),
  deleteMessage: jest.fn(),
  countByServer: jest.fn(),
};

const mockGateway = {
  emitToServer: jest.fn(),
};

const allowAll = { canActivate: () => true };

describe('MessagesController', () => {
  let controller: MessagesController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        { provide: MessagesService, useValue: mockMessagesService },
        { provide: RealtimeGateway, useValue: mockGateway },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(allowAll)
      .overrideGuard(ServerScopeGuard)
      .useValue(allowAll)
      .compile();
    controller = module.get(MessagesController);
  });

  describe('list', () => {
    it('coerces the limit query string to a number and forwards the cursor', async () => {
      mockMessagesService.listMessages.mockResolvedValue([]);

      await controller.list(user, 's1', 'c1', '25', 'm9');
      expect(mockMessagesService.listMessages).toHaveBeenCalledWith('s1', 'c1', 'u1', {
        limit: 25,
        before: 'm9',
      });
    });

    it('leaves the limit undefined when the query param is absent', async () => {
      mockMessagesService.listMessages.mockResolvedValue([]);

      await controller.list(user, 's1', 'c1');
      expect(mockMessagesService.listMessages).toHaveBeenCalledWith('s1', 'c1', 'u1', {
        limit: undefined,
        before: undefined,
      });
    });
  });

  describe('create', () => {
    it('persists then broadcasts the created message to the server room', async () => {
      const msg = { id: 'm1', channelId: 'c1', content: 'hi' };
      mockMessagesService.createMessage.mockResolvedValue(msg);

      await expect(controller.create(user, 's1', 'c1', { content: 'hi' })).resolves.toBe(msg);
      expect(mockMessagesService.createMessage).toHaveBeenCalledWith('s1', 'c1', 'u1', {
        content: 'hi',
      });
      expect(mockGateway.emitToServer).toHaveBeenCalledWith('s1', 'message:sent', msg);
    });

    it('does not broadcast when persistence fails', async () => {
      mockMessagesService.createMessage.mockRejectedValue(new ForbiddenException());

      await expect(controller.create(user, 's1', 'c1', { content: 'hi' })).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockGateway.emitToServer).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('broadcasts the updated message on the server room', async () => {
      const msg = { id: 'm1', channelId: 'c1', content: 'edited' };
      mockMessagesService.updateMessage.mockResolvedValue(msg);

      await expect(controller.update(user, 's1', 'c1', 'm1', { content: 'edited' })).resolves.toBe(
        msg,
      );
      expect(mockMessagesService.updateMessage).toHaveBeenCalledWith('s1', 'c1', 'm1', 'u1', {
        content: 'edited',
      });
      expect(mockGateway.emitToServer).toHaveBeenCalledWith('s1', 'message:updated', msg);
    });

    it('does not broadcast when the update is rejected', async () => {
      mockMessagesService.updateMessage.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.update(user, 's1', 'c1', 'm1', { content: 'edited' }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockGateway.emitToServer).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('broadcasts the deleted identifiers and returns no body', async () => {
      mockMessagesService.deleteMessage.mockResolvedValue(undefined);

      await expect(controller.remove(user, 's1', 'c1', 'm1')).resolves.toBeUndefined();
      expect(mockMessagesService.deleteMessage).toHaveBeenCalledWith('s1', 'c1', 'm1', 'u1');
      expect(mockGateway.emitToServer).toHaveBeenCalledWith('s1', 'message:deleted', {
        id: 'm1',
        channelId: 'c1',
      });
    });

    it('does not broadcast when the delete is rejected', async () => {
      mockMessagesService.deleteMessage.mockRejectedValue(new ForbiddenException());

      await expect(controller.remove(user, 's1', 'c1', 'm1')).rejects.toThrow(ForbiddenException);
      expect(mockGateway.emitToServer).not.toHaveBeenCalled();
    });
  });
});

describe('MessageCountsController', () => {
  let controller: MessageCountsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [MessageCountsController],
      providers: [{ provide: MessagesService, useValue: mockMessagesService }],
    })
      .overrideGuard(AuthGuard)
      .useValue(allowAll)
      .overrideGuard(ServerScopeGuard)
      .useValue(allowAll)
      .compile();
    controller = module.get(MessageCountsController);
  });

  it('counts messages for the server in the path only', async () => {
    mockMessagesService.countByServer.mockResolvedValue({ c1: 3 });

    await expect(controller.list('s1')).resolves.toEqual({ c1: 3 });
    expect(mockMessagesService.countByServer).toHaveBeenCalledWith('s1');
  });
});

import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthSession } from '../auth/auth.types';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { DmsController } from './dms.controller';
import { DmsService } from './dms.service';

const user: AuthSession['user'] = {
  id: 'u1',
  email: 'u1@nookapp.test',
  name: 'User One',
  emailVerified: true,
  createdAt: new Date('2025-01-01'),
};

const mockDmsService = {
  listConversations: jest.fn(),
  listCandidates: jest.fn(),
  lookupByUsername: jest.fn(),
  openConversation: jest.fn(),
  listMessages: jest.fn(),
  createMessage: jest.fn(),
  markRead: jest.fn(),
};

const mockGateway = {
  emitToUser: jest.fn(),
};

const allowAll = { canActivate: () => true };

describe('DmsController', () => {
  let controller: DmsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [DmsController],
      providers: [
        { provide: DmsService, useValue: mockDmsService },
        { provide: RealtimeGateway, useValue: mockGateway },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(allowAll)
      .compile();
    controller = module.get(DmsController);
  });

  it('lists only the conversations of the session user', async () => {
    mockDmsService.listConversations.mockResolvedValue([]);

    await controller.list(user);
    expect(mockDmsService.listConversations).toHaveBeenCalledWith('u1');
  });

  it('lists candidates for the session user', async () => {
    mockDmsService.listCandidates.mockResolvedValue([]);

    await controller.candidates(user);
    expect(mockDmsService.listCandidates).toHaveBeenCalledWith('u1');
  });

  describe('lookup', () => {
    it('forwards the username query alongside the session user', async () => {
      mockDmsService.lookupByUsername.mockResolvedValue(null);

      await controller.lookup(user, 'bob');
      expect(mockDmsService.lookupByUsername).toHaveBeenCalledWith('bob', 'u1');
    });

    it('substitutes an empty string when the query param is missing', async () => {
      mockDmsService.lookupByUsername.mockResolvedValue(null);

      // The param is typed as required but Express yields undefined when
      // ?username= is omitted, so the controller has to absorb that case.
      await controller.lookup(user, undefined as unknown as string);
      expect(mockDmsService.lookupByUsername).toHaveBeenCalledWith('', 'u1');
    });
  });

  it('opens a conversation with the recipient taken from the body', async () => {
    mockDmsService.openConversation.mockResolvedValue({ id: 'd1' });

    await controller.open(user, { recipientId: 'u2' });
    expect(mockDmsService.openConversation).toHaveBeenCalledWith('u1', 'u2');
  });

  it('coerces the limit query string to a number when listing messages', async () => {
    mockDmsService.listMessages.mockResolvedValue([]);

    await controller.messages(user, 'd1', '10', 'm5');
    expect(mockDmsService.listMessages).toHaveBeenCalledWith('d1', 'u1', {
      limit: 10,
      before: 'm5',
    });
  });

  it('leaves the limit undefined when the query param is absent', async () => {
    mockDmsService.listMessages.mockResolvedValue([]);

    await controller.messages(user, 'd1');
    expect(mockDmsService.listMessages).toHaveBeenCalledWith('d1', 'u1', {
      limit: undefined,
      before: undefined,
    });
  });

  describe('send', () => {
    it('fans the message out to every participant and returns it', async () => {
      const message = { id: 'm1', conversationId: 'd1', content: 'hi' };
      mockDmsService.createMessage.mockResolvedValue({
        message,
        participantIds: ['u1', 'u2'],
      });

      await expect(controller.send(user, 'd1', { content: 'hi' })).resolves.toBe(message);
      expect(mockDmsService.createMessage).toHaveBeenCalledWith('d1', 'u1', { content: 'hi' });
      expect(mockGateway.emitToUser).toHaveBeenCalledTimes(2);
      expect(mockGateway.emitToUser).toHaveBeenNthCalledWith(1, 'u1', 'dm:message', message);
      expect(mockGateway.emitToUser).toHaveBeenNthCalledWith(2, 'u2', 'dm:message', message);
    });

    it('does not fan out when the user is not a participant', async () => {
      mockDmsService.createMessage.mockRejectedValue(new ForbiddenException());

      await expect(controller.send(user, 'd1', { content: 'hi' })).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockGateway.emitToUser).not.toHaveBeenCalled();
    });
  });

  it('marks a conversation read for the session user', async () => {
    mockDmsService.markRead.mockResolvedValue(undefined);

    await controller.read(user, 'd1');
    expect(mockDmsService.markRead).toHaveBeenCalledWith('d1', 'u1');
  });
});

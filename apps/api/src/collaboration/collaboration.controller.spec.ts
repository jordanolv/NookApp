import { Test } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';

// @hocuspocus/server pulls in an ESM-only dependency that ts-jest cannot load.
// The service is injected as a mock here, so stubbing the module is enough.
jest.mock('@hocuspocus/server', () => ({ Server: class {} }));

import type { AuthSession } from '../auth/auth.types';
import { CollaborationController } from './collaboration.controller';
import { CollaborationService } from './collaboration.service';

const user: AuthSession['user'] = {
  id: 'u1',
  email: 'u1@nookapp.test',
  name: 'User One',
  emailVerified: true,
  createdAt: new Date('2025-01-01'),
};

const mockCollaborationService = {
  signToken: jest.fn(),
};

const allowAll = { canActivate: () => true };

describe('CollaborationController', () => {
  let controller: CollaborationController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [CollaborationController],
      providers: [{ provide: CollaborationService, useValue: mockCollaborationService }],
    })
      .overrideGuard(AuthGuard)
      .useValue(allowAll)
      .compile();
    controller = module.get(CollaborationController);
  });

  it('signs the token for the session user and wraps it in an envelope', () => {
    mockCollaborationService.signToken.mockReturnValue('jwt');

    expect(controller.getToken(user)).toEqual({ token: 'jwt' });
    expect(mockCollaborationService.signToken).toHaveBeenCalledWith('u1');
  });

  it('propagates a signing failure', () => {
    mockCollaborationService.signToken.mockImplementation(() => {
      throw new Error('missing secret');
    });

    expect(() => controller.getToken(user)).toThrow('missing secret');
  });
});

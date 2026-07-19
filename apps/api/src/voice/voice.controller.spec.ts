import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import { ServerScopeGuard } from '../members/server-scope.guard';
import type { AuthSession } from '../auth/auth.types';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';

const user: AuthSession['user'] = {
  id: 'u1',
  email: 'u1@nookapp.test',
  name: 'User One',
  emailVerified: true,
  createdAt: new Date('2025-01-01'),
};

const mockVoiceService = {
  getToken: jest.fn(),
};

const allowAll = { canActivate: () => true };

describe('VoiceController', () => {
  let controller: VoiceController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [VoiceController],
      providers: [{ provide: VoiceService, useValue: mockVoiceService }],
    })
      .overrideGuard(AuthGuard)
      .useValue(allowAll)
      .overrideGuard(ServerScopeGuard)
      .useValue(allowAll)
      .compile();
    controller = module.get(VoiceController);
  });

  it('mints a token scoped to the server, the channel and the session user', async () => {
    mockVoiceService.getToken.mockResolvedValue({ token: 'jwt', room: 's1:c1' });

    await expect(controller.getToken(user, 's1', 'c1')).resolves.toEqual({
      token: 'jwt',
      room: 's1:c1',
    });
    expect(mockVoiceService.getToken).toHaveBeenCalledWith('s1', 'c1', 'u1');
  });

  it('propagates a refused token request', async () => {
    mockVoiceService.getToken.mockRejectedValue(new ForbiddenException());

    await expect(controller.getToken(user, 's1', 'c1')).rejects.toThrow(ForbiddenException);
  });
});

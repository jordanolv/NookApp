import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import { ServerScopeGuard } from '../members/server-scope.guard';
import { updateMapInputSchema } from '@nookapp/protocol';
import type { AuthSession } from '../auth/auth.types';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';

const user: AuthSession['user'] = {
  id: 'u1',
  email: 'u1@nookapp.test',
  name: 'User One',
  emailVerified: true,
  createdAt: new Date('2025-01-01'),
};

const mockMapsService = {
  getMap: jest.fn(),
  saveMap: jest.fn(),
};

// Built through the real schema so the spec exercises the same defaults the
// ZodPipe applies before the controller ever sees the body.
const body = updateMapInputSchema.parse({
  data: { layers: { floors: [{ x: 1, y: 2, asset: 'a' }] } },
});

const allowAll = { canActivate: () => true };

describe('MapsController', () => {
  let controller: MapsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [MapsController],
      providers: [{ provide: MapsService, useValue: mockMapsService }],
    })
      .overrideGuard(AuthGuard)
      .useValue(allowAll)
      .overrideGuard(ServerScopeGuard)
      .useValue(allowAll)
      .compile();
    controller = module.get(MapsController);
  });

  it('reads the map of the server in the path for the session user', async () => {
    mockMapsService.getMap.mockResolvedValue({ serverId: 's1' });

    await expect(controller.get(user, 's1')).resolves.toEqual({ serverId: 's1' });
    expect(mockMapsService.getMap).toHaveBeenCalledWith('s1', 'u1');
  });

  it('unwraps the data envelope before handing it to the service', async () => {
    mockMapsService.saveMap.mockResolvedValue({ serverId: 's1' });

    await controller.save(user, 's1', body);
    expect(mockMapsService.saveMap).toHaveBeenCalledWith('s1', 'u1', body.data);
    expect(body.data.layers.floors).toEqual([{ x: 1, y: 2, asset: 'a' }]);
  });

  it('propagates a refused save', async () => {
    mockMapsService.saveMap.mockRejectedValue(new ForbiddenException());

    await expect(controller.save(user, 's1', body)).rejects.toThrow(ForbiddenException);
  });
});

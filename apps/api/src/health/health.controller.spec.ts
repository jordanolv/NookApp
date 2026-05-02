import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { DB } from '../database/database.module';

describe('HealthController', () => {
  it('returns ok when db responds', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DB, useValue: { execute: jest.fn().mockResolvedValue([]) } }],
    }).compile();
    const ctrl = moduleRef.get(HealthController);
    await expect(ctrl.check()).resolves.toEqual({ status: 'ok', db: true });
  });

  it('returns degraded when db throws', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: DB, useValue: { execute: jest.fn().mockRejectedValue(new Error('x')) } }],
    }).compile();
    const ctrl = moduleRef.get(HealthController);
    await expect(ctrl.check()).resolves.toEqual({ status: 'degraded', db: false });
  });
});

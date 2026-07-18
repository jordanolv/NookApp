import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AccessToken } from 'livekit-server-sdk';
import { DB } from '../database/database.module';
import { VoiceService } from './voice.service';

// Never issue a real token: the SDK is replaced by a recording double so we can
// assert identity, ttl and the room grant without any LiveKit server.
jest.mock('livekit-server-sdk', () => ({
  AccessToken: jest.fn(),
}));

const mockDb = {
  select: jest.fn(),
};

const mockConfig = {
  getOrThrow: jest.fn((key: string) => (key === 'LIVEKIT_API_KEY' ? 'devkey' : 'devsecret')),
};

const addGrant = jest.fn();
const toJwt = jest.fn().mockResolvedValue('signed.jwt.value');
const AccessTokenMock = AccessToken as unknown as jest.Mock;

function selectChain(rows: unknown[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(rows),
  };
}

describe('VoiceService', () => {
  let service: VoiceService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfig.getOrThrow.mockImplementation((key: string) =>
      key === 'LIVEKIT_API_KEY' ? 'devkey' : 'devsecret',
    );
    toJwt.mockResolvedValue('signed.jwt.value');
    AccessTokenMock.mockImplementation(() => ({ addGrant, toJwt }));

    const module = await Test.createTestingModule({
      providers: [
        VoiceService,
        { provide: DB, useValue: mockDb },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(VoiceService);
  });

  describe('getToken', () => {
    it('issues a token scoped to the single room `${serverId}:${channelId}`', async () => {
      mockDb.select
        .mockReturnValueOnce(selectChain([{ id: 'c1', type: 'voice' }]))
        .mockReturnValueOnce(selectChain([{ id: 'm1' }]));

      const result = await service.getToken('s1', 'c1', 'u1');

      expect(result).toEqual({ token: 'signed.jwt.value' });
      expect(AccessTokenMock).toHaveBeenCalledWith('devkey', 'devsecret', {
        identity: 'u1',
        ttl: '10m',
      });
      expect(addGrant).toHaveBeenCalledTimes(1);
      expect(addGrant).toHaveBeenCalledWith({
        roomJoin: true,
        room: 's1:c1',
        canPublish: true,
        canSubscribe: true,
      });
    });

    it('grants no access to any other room', async () => {
      mockDb.select
        .mockReturnValueOnce(selectChain([{ id: 'c1', type: 'voice' }]))
        .mockReturnValueOnce(selectChain([{ id: 'm1' }]));

      await service.getToken('s1', 'c1', 'u1');

      const grant = addGrant.mock.calls[0][0] as Record<string, unknown>;
      expect(grant.room).toBe('s1:c1');
      expect(grant.roomAdmin).toBeUndefined();
      expect(grant.roomCreate).toBeUndefined();
      expect(grant.roomList).toBeUndefined();
    });

    it('throws ForbiddenException when the channel is not in this server', async () => {
      mockDb.select.mockReturnValueOnce(selectChain([]));

      await expect(service.getToken('s1', 'c1', 'u1')).rejects.toThrow(ForbiddenException);
      expect(AccessTokenMock).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the channel is not a voice channel', async () => {
      mockDb.select.mockReturnValueOnce(selectChain([{ id: 'c1', type: 'text' }]));

      await expect(service.getToken('s1', 'c1', 'u1')).rejects.toThrow(ForbiddenException);
      expect(AccessTokenMock).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the user is not a member of the server', async () => {
      mockDb.select
        .mockReturnValueOnce(selectChain([{ id: 'c1', type: 'voice' }]))
        .mockReturnValueOnce(selectChain([]));

      await expect(service.getToken('s1', 'c1', 'u1')).rejects.toThrow(ForbiddenException);
      expect(AccessTokenMock).not.toHaveBeenCalled();
    });
  });

  it('fails fast when LiveKit credentials are missing', async () => {
    mockConfig.getOrThrow.mockImplementation((key: string) => {
      throw new Error(`missing ${key}`);
    });

    await expect(
      Test.createTestingModule({
        providers: [
          VoiceService,
          { provide: DB, useValue: mockDb },
          { provide: ConfigService, useValue: mockConfig },
        ],
      }).compile(),
    ).rejects.toThrow(/LIVEKIT_API_KEY/);
  });
});

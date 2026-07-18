import { Test } from '@nestjs/testing';
import * as Y from 'yjs';
import { DEFAULT_MAP, type DecorObject, type FloorCell, type WallCell } from '@nookapp/protocol';
import { DB } from '../database/database.module';
import { AUTH } from '../auth/auth.types';
import { CollaborationService } from './collaboration.service';

// The Hocuspocus server binds a port on construction, so it is replaced by a
// double that only records the hook config the service registers.
const listen = jest.fn().mockResolvedValue(undefined);
const destroy = jest.fn().mockResolvedValue(undefined);
let capturedConfig: unknown;

jest.mock('@hocuspocus/server', () => ({
  Server: jest.fn().mockImplementation((config: unknown) => {
    capturedConfig = config;
    return { listen, destroy };
  }),
}));

// Hocuspocus payload types carry a dozen unrelated fields; the hooks only read
// documentName / token / document, so the captured config is narrowed to that.
interface Hooks {
  onAuthenticate(payload: { documentName: string; token: string }): Promise<{ id: string }>;
  onLoadDocument(payload: { documentName: string; document: Y.Doc }): Promise<void>;
  onChange(payload: { documentName: string; document: Y.Doc }): Promise<void>;
}

const mockDb = {
  select: jest.fn(),
  insert: jest.fn(),
};

function selectChain(rows: unknown[]) {
  return {
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(rows),
  };
}

function insertChain() {
  const onConflictDoUpdate = jest.fn().mockResolvedValue(undefined);
  const values = jest.fn().mockReturnValue({ onConflictDoUpdate });
  return { chain: { values }, values, onConflictDoUpdate };
}

describe('CollaborationService', () => {
  let service: CollaborationService;
  let hooks: Hooks;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-collab-secret';

    const module = await Test.createTestingModule({
      providers: [
        CollaborationService,
        { provide: DB, useValue: mockDb },
        { provide: AUTH, useValue: {} },
      ],
    }).compile();
    service = module.get(CollaborationService);
    hooks = capturedConfig as Hooks;
  });

  describe('signToken', () => {
    it('produces a payload.signature token carrying the user id', () => {
      const token = service.signToken('u1');
      const [payload, sig] = token.split('.');
      expect(sig).toBeTruthy();
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
        userId: string;
        exp: number;
      };
      expect(decoded.userId).toBe('u1');
      expect(decoded.exp).toBeGreaterThan(Date.now());
    });

    it('falls back to a dev secret when JWT_SECRET is unset', async () => {
      delete process.env.JWT_SECRET;
      const module = await Test.createTestingModule({
        providers: [
          CollaborationService,
          { provide: DB, useValue: mockDb },
          { provide: AUTH, useValue: {} },
        ],
      }).compile();
      const unconfigured = module.get(CollaborationService);
      mockDb.select.mockReturnValueOnce(selectChain([{ id: 'm1' }]));

      const fallbackHooks = capturedConfig as Hooks;
      await expect(
        fallbackHooks.onAuthenticate({ documentName: 's1', token: unconfigured.signToken('u1') }),
      ).resolves.toEqual({ id: 'u1' });
    });
  });

  describe('onAuthenticate', () => {
    it('accepts a member of the server named by the document', async () => {
      mockDb.select.mockReturnValueOnce(selectChain([{ id: 'm1' }]));

      const user = await hooks.onAuthenticate({
        documentName: 's1',
        token: service.signToken('u1'),
      });

      expect(user).toEqual({ id: 'u1' });
    });

    it('rejects a valid token from a non-member', async () => {
      mockDb.select.mockReturnValueOnce(selectChain([]));

      await expect(
        hooks.onAuthenticate({ documentName: 's1', token: service.signToken('u1') }),
      ).rejects.toThrow(/not a member/);
    });

    it('rejects a malformed token', async () => {
      await expect(hooks.onAuthenticate({ documentName: 's1', token: 'nodot' })).rejects.toThrow(
        /malformed token/,
      );
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('rejects a token signed with another secret', async () => {
      const token = service.signToken('u1');
      const forged = `${token.split('.')[0]}.dGFtcGVyZWQ`;

      await expect(hooks.onAuthenticate({ documentName: 's1', token: forged })).rejects.toThrow(
        /invalid signature/,
      );
      expect(mockDb.select).not.toHaveBeenCalled();
    });

    it('rejects an expired token', async () => {
      const token = service.signToken('u1');
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 60 * 60 * 1000);

      await expect(hooks.onAuthenticate({ documentName: 's1', token })).rejects.toThrow(
        /token expired/,
      );
      jest.restoreAllMocks();
    });
  });

  describe('onLoadDocument', () => {
    it('hydrates an empty document from the stored map', async () => {
      const floors: FloorCell[] = [{ x: 1, y: 2, asset: 'office_floor_light' }];
      const walls: WallCell[] = [{ x: 5, y: 6, frame: 42 }];
      const decor: DecorObject[] = [{ x: 3, y: 4, id: 'd1', asset: 'chair' }];
      mockDb.select.mockReturnValueOnce(
        selectChain([
          {
            serverId: 's1',
            data: { ...DEFAULT_MAP, layers: { floors, walls, decor, collision: [] } },
          },
        ]),
      );
      const document = new Y.Doc();

      await hooks.onLoadDocument({ documentName: 's1', document });

      expect(document.getArray<FloorCell>('floors').toArray()).toEqual(floors);
      expect(document.getArray<WallCell>('walls').toArray()).toEqual(walls);
      expect(document.getArray<DecorObject>('decor').toArray()).toEqual(decor);
    });

    it('falls back to the default map when the server has no stored map', async () => {
      mockDb.select.mockReturnValueOnce(selectChain([]));
      const document = new Y.Doc();

      await hooks.onLoadDocument({ documentName: 's1', document });

      expect(document.getArray<FloorCell>('floors').length).toBe(DEFAULT_MAP.layers.floors.length);
    });

    it('leaves an already populated document untouched', async () => {
      const document = new Y.Doc();
      document.getArray<FloorCell>('floors').insert(0, [{ x: 9, y: 9, asset: 'existing' }]);

      await hooks.onLoadDocument({ documentName: 's1', document });

      expect(mockDb.select).not.toHaveBeenCalled();
      expect(document.getArray<FloorCell>('floors').length).toBe(1);
    });

    it('skips hydration when the stored map fails validation', async () => {
      mockDb.select.mockReturnValueOnce(selectChain([{ serverId: 's1', data: { width: 'wide' } }]));
      const document = new Y.Doc();

      await hooks.onLoadDocument({ documentName: 's1', document });

      expect(document.getArray('floors').length).toBe(0);
    });
  });

  describe('onChange', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('persists the document once after the debounce window', async () => {
      const { chain, values, onConflictDoUpdate } = insertChain();
      mockDb.insert.mockReturnValue(chain);
      const document = new Y.Doc();
      document.getArray<FloorCell>('floors').insert(0, [{ x: 1, y: 1, asset: 'office_floor' }]);

      await hooks.onChange({ documentName: 's1', document });
      await hooks.onChange({ documentName: 's1', document });
      expect(mockDb.insert).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(mockDb.insert).toHaveBeenCalledTimes(1);
      const persisted = values.mock.calls[0][0] as { serverId: string; data: { layers: unknown } };
      expect(persisted.serverId).toBe('s1');
      expect(persisted.data.layers).toMatchObject({
        floors: [{ x: 1, y: 1, asset: 'office_floor' }],
      });
      expect(onConflictDoUpdate).toHaveBeenCalledTimes(1);
    });

    it('skips the write when the document holds invalid map data', async () => {
      mockDb.insert.mockReturnValue(insertChain().chain);
      const document = new Y.Doc();
      document.getArray('floors').insert(0, [{ x: -5, y: 1, asset: '' }]);

      await hooks.onChange({ documentName: 's1', document });
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('lifecycle', () => {
    it('starts the hocuspocus server on listen', async () => {
      await service.listen();
      expect(listen).toHaveBeenCalledTimes(1);
    });

    it('clears pending save timers and destroys the server on shutdown', async () => {
      jest.useFakeTimers();
      mockDb.insert.mockReturnValue(insertChain().chain);
      const document = new Y.Doc();
      await hooks.onChange({ documentName: 's1', document });

      await service.onApplicationShutdown();

      jest.advanceTimersByTime(5000);
      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(destroy).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });
  });
});

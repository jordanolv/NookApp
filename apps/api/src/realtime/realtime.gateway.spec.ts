import type { Server, Socket } from 'socket.io';
import { RealtimeGateway } from './realtime.gateway';
import type { AuthService } from '../auth/auth.service';
import type { MembersService } from '../members/members.service';

function makeGateway(isMember = true) {
  const emit = jest.fn();
  const members = { isMember: jest.fn().mockResolvedValue(isMember) } as unknown as MembersService;
  const gateway = new RealtimeGateway({} as AuthService, members);
  gateway.server = { to: jest.fn(() => ({ emit })) } as unknown as Server;
  const clientEmit = jest.fn();
  const join = jest.fn();
  const client = {
    data: { serverId: 'srv-1', userId: 'user-1' },
    to: jest.fn(() => ({ emit })),
    emit: clientEmit,
    join,
  } as unknown as Socket;
  return { gateway, client, emit, clientEmit, join };
}

describe('RealtimeGateway.handleServerJoin', () => {
  it('joins the room and sends the voice snapshot without registering a player', async () => {
    const { gateway, client, clientEmit, join } = makeGateway();
    (client.data as { serverId?: string }).serverId = undefined;
    await gateway.handleServerJoin(client, { serverId: 'srv-1', name: 'Jordan' });
    expect(join).toHaveBeenCalledWith('server:srv-1');
    expect(client.data.serverId).toBe('srv-1');
    expect(clientEmit).toHaveBeenCalledWith('voice:snapshot', { participants: [] });
    expect(clientEmit).not.toHaveBeenCalledWith('player:snapshot', expect.anything());
  });

  it('rejects a non-member', async () => {
    const { gateway, client, clientEmit, join } = makeGateway(false);
    await gateway.handleServerJoin(client, { serverId: 'srv-1', name: 'Jordan' });
    expect(join).not.toHaveBeenCalled();
    expect(clientEmit).toHaveBeenCalledWith(
      'player:error',
      expect.objectContaining({ code: 'forbidden' }),
    );
  });

  it('lists a classic client in the voice snapshot once it joined voice', async () => {
    const { gateway, client, clientEmit } = makeGateway();
    await gateway.handleServerJoin(client, { serverId: 'srv-1', name: 'Jordan' });
    gateway.handleVoiceJoin(client, { channelId: 'voc-1' });
    clientEmit.mockClear();
    await gateway.handleServerJoin(client, { serverId: 'srv-1', name: 'Jordan' });
    expect(clientEmit).toHaveBeenCalledWith('voice:snapshot', {
      participants: [{ userId: 'user-1', name: 'Jordan', channelId: 'voc-1' }],
    });
  });
});

describe('RealtimeGateway.handleVoiceJoin', () => {
  it('sends the joiner a snapshot of who is already in voice', async () => {
    const { gateway, client } = makeGateway();
    await gateway.handleServerJoin(client, { serverId: 'srv-1', name: 'Jordan' });
    gateway.handleVoiceJoin(client, { channelId: 'voc-1' });

    const { client: other, clientEmit: otherEmit } = makeGateway();
    (other.data as { userId: string }).userId = 'user-2';
    await gateway.handleServerJoin(other, { serverId: 'srv-1', name: 'Ynov' });
    otherEmit.mockClear();
    gateway.handleVoiceJoin(other, { channelId: 'voc-1' });

    expect(otherEmit).toHaveBeenCalledWith('voice:snapshot', {
      participants: [
        { userId: 'user-1', name: 'Jordan', channelId: 'voc-1' },
        { userId: 'user-2', name: 'Ynov', channelId: 'voc-1' },
      ],
    });
  });
});

describe('RealtimeGateway.handlePlayerPresence', () => {
  const presence = { status: 'busy', activity: null, muted: true, deafened: false };

  it('broadcasts a valid presence to the other players', () => {
    const { gateway, client, emit } = makeGateway();
    gateway.handlePlayerPresence(client, { presence });
    expect(emit).toHaveBeenCalledWith('player:presence', { userId: 'user-1', presence });
  });

  it('drops a presence with an unknown status', () => {
    const { gateway, client, emit } = makeGateway();
    gateway.handlePlayerPresence(client, { presence: { ...presence, status: 'invisible' } });
    expect(emit).not.toHaveBeenCalled();
  });
});

describe('RealtimeGateway.handlePlayerEmote', () => {
  it('broadcasts a valid emote to the whole server room, sender included', () => {
    const { gateway, client, emit } = makeGateway();
    gateway.handlePlayerEmote(client, { emote: 'wave' });
    expect(gateway.server.to).toHaveBeenCalledWith('server:srv-1');
    expect(emit).toHaveBeenCalledWith('player:emote', { userId: 'user-1', emote: 'wave' });
  });

  it('drops unknown emotes', () => {
    const { gateway, client, emit } = makeGateway();
    gateway.handlePlayerEmote(client, { emote: 'backflip' });
    expect(emit).not.toHaveBeenCalled();
  });
});

import type { Server, Socket } from 'socket.io';
import { RealtimeGateway } from './realtime.gateway';
import type { AuthService } from '../auth/auth.service';
import type { MembersService } from '../members/members.service';

function makeGateway() {
  const emit = jest.fn();
  const gateway = new RealtimeGateway({} as AuthService, {} as MembersService);
  gateway.server = { to: jest.fn(() => ({ emit })) } as unknown as Server;
  const client = { data: { serverId: 'srv-1', userId: 'user-1' } } as unknown as Socket;
  return { gateway, client, emit };
}

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

import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq } from 'drizzle-orm';
import { AccessToken } from 'livekit-server-sdk';
import { channel, member, type Database } from '@nookapp/db';
import { DB } from '../database/database.module';

@Injectable()
export class VoiceService {
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.getOrThrow<string>('LIVEKIT_API_KEY');
    this.apiSecret = this.config.getOrThrow<string>('LIVEKIT_API_SECRET');
  }

  async getToken(serverId: string, channelId: string, userId: string): Promise<{ token: string }> {
    const [ch] = await this.db
      .select({ id: channel.id, type: channel.type })
      .from(channel)
      .where(and(eq(channel.id, channelId), eq(channel.serverId, serverId)))
      .limit(1);

    if (!ch) throw new ForbiddenException('Channel not found in this server');
    if (ch.type !== 'voice') throw new ForbiddenException('Channel is not a voice channel');

    const [m] = await this.db
      .select({ id: member.id })
      .from(member)
      .where(and(eq(member.serverId, serverId), eq(member.userId, userId)))
      .limit(1);

    if (!m) throw new ForbiddenException('Not a member of this server');

    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: userId,
      ttl: '10m',
    });
    at.addGrant({
      roomJoin: true,
      room: `${serverId}:${channelId}`,
      canPublish: true,
      canSubscribe: true,
    });

    return { token: await at.toJwt() };
  }
}

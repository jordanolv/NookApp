import type { ChannelPublic, ChannelType } from '@nookapp/protocol';

export interface ChannelStat {
  num: number;
  label: string;
}

export interface ChannelStatContext {
  messageCount(channelId: string): number;
  childrenCount(channelId: string): number;
}

export type ChannelStatProvider = (channel: ChannelPublic, ctx: ChannelStatContext) => ChannelStat;

const providers = new Map<ChannelType, ChannelStatProvider>();

export function registerChannelStat(type: ChannelType, provider: ChannelStatProvider) {
  providers.set(type, provider);
}

export function getChannelStat(
  channel: ChannelPublic,
  ctx: ChannelStatContext,
): ChannelStat | null {
  const provider = providers.get(channel.type);
  return provider ? provider(channel, ctx) : null;
}

// Built-in defaults — plugins can override by calling registerChannelStat() again.
// Game and widget channels have no default stat: a plugin owning that type registers its own.
registerChannelStat('text', (ch, ctx) => ({ num: ctx.messageCount(ch.id), label: 'msg' }));
registerChannelStat('forum', (ch, ctx) => ({ num: ctx.childrenCount(ch.id), label: 'post' }));

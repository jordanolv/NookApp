import { type InjectionKey } from 'vue';
import type { ChannelPublic } from '@nookapp/protocol';
import { useMessagesStore } from '~/stores/messages';
import { channelAccentRgb, channelCardStyle, channelIconStyle } from '~/utils/channel-theme';

export type ChannelStat = { num: number; label: string };

export type ChannelLastMessage = {
  authorId: string;
  content: string;
  createdAt: string;
};

export type ChannelCardData = {
  lastMessageOf: (channelId: string) => ChannelLastMessage | null;
  statOf: (ch: ChannelPublic) => ChannelStat;
  cardStyle: (ch: ChannelPublic) => Record<string, string>;
  iconStyle: (ch: ChannelPublic) => Record<string, string>;
  accent: (ch: ChannelPublic) => string;
};

export const CHANNEL_CARD_DATA: InjectionKey<ChannelCardData> = Symbol('channel-card-data');

export function useChannelCardData(_opts: {
  childrenCount: (channelId: string) => number;
}): ChannelCardData {
  const messages = useMessagesStore();
  const { resolveUrl } = useResolveUrl();
  const readState = useChannelReadState();

  function lastMessageOf(channelId: string): ChannelLastMessage | null {
    const list = messages.byChannel[channelId];
    const last = list && list.length ? (list[list.length - 1] as ChannelLastMessage) : null;
    if (!last) return null;
    return readState.isUnread(channelId, last.createdAt) ? last : null;
  }

  function statOf(_ch: ChannelPublic): ChannelStat {
    return { num: 0, label: '' };
  }

  function cardStyle(ch: ChannelPublic): Record<string, string> {
    return channelCardStyle(ch, resolveUrl(ch.bannerUrl));
  }

  function iconStyle(ch: ChannelPublic): Record<string, string> {
    return channelIconStyle(ch);
  }

  function accent(ch: ChannelPublic): string {
    return channelAccentRgb(ch);
  }

  return { lastMessageOf, statOf, cardStyle, iconStyle, accent };
}

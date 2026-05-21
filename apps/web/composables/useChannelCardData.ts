import { type InjectionKey } from 'vue';
import type { ChannelPublic } from '@nookapp/protocol';
import { useMessagesStore } from '~/stores/messages';

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
  iconBg: (ch: ChannelPublic) => Record<string, string>;
};

export const CHANNEL_CARD_DATA: InjectionKey<ChannelCardData> = Symbol('channel-card-data');

export function useChannelCardData(_opts: {
  childrenCount: (channelId: string) => number;
}): ChannelCardData {
  const messages = useMessagesStore();
  const { resolveUrl } = useResolveUrl();

  function lastMessageOf(channelId: string): ChannelLastMessage | null {
    const list = messages.byChannel[channelId];
    return list && list.length ? (list[list.length - 1] as ChannelLastMessage) : null;
  }

  function statOf(_ch: ChannelPublic): ChannelStat {
    return { num: 0, label: '' };
  }

  function cardStyle(ch: ChannelPublic): Record<string, string> {
    const banner = resolveUrl(ch.bannerUrl);
    if (banner) {
      return {
        backgroundImage: `url(${banner})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    return { background: 'rgba(255, 255, 255, 0.05)' };
  }

  function iconBg(ch: ChannelPublic): Record<string, string> {
    return ch.bannerUrl
      ? { background: 'rgba(0, 0, 0, 0.55)' }
      : { background: 'rgba(255, 255, 255, 0.08)' };
  }

  return { lastMessageOf, statOf, cardStyle, iconBg };
}

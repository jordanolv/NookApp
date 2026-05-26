import type { Component } from 'vue';
import { Hash, MessageSquare, Gamepad2, Sticker } from 'lucide-vue-next';
import type { ChannelPublic } from '@nookapp/protocol';
import { iconComponentByName } from './channel-icons';

export function iconForChannel(
  typeOrChannel: ChannelPublic['type'] | Pick<ChannelPublic, 'type' | 'iconName'>,
): Component {
  if (typeof typeOrChannel === 'object') {
    const custom = iconComponentByName(typeOrChannel.iconName);
    if (custom) return custom;
    return defaultIconForType(typeOrChannel.type);
  }
  return defaultIconForType(typeOrChannel);
}

function defaultIconForType(type: ChannelPublic['type']): Component {
  switch (type) {
    case 'forum':
      return MessageSquare;
    case 'game':
      return Gamepad2;
    case 'widget':
      return Sticker;
    case 'text':
    default:
      return Hash;
  }
}

export function snippet(content: string, max = 40): string {
  const oneLine = content.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? oneLine.slice(0, max - 1) + '…' : oneLine;
}

export function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export function hueFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function authorLabel(authorId: string): string {
  return '@' + authorId.slice(0, 8);
}

export function authorInitials(authorId: string): string {
  return authorId.slice(0, 2).toUpperCase();
}

export function authorAvatarStyle(authorId: string) {
  const hue = hueFor(authorId);
  return {
    background: `linear-gradient(135deg, hsl(${hue}, 70%, 55%), hsl(${(hue + 40) % 360}, 70%, 42%))`,
  };
}

import type { ChannelPublic } from '@nookapp/protocol';

const TYPE_HUES: Record<string, string[]> = {
  text: [
    '116, 184, 111', // leaf
    '109, 180, 214', // cool
    '232, 163, 90', // warm
    '217, 122, 122', // rose
    '154, 122, 217', // violet
    '122, 138, 168', // slate
    '90, 140, 110', // moss
    '186, 132, 90', // tobacco
  ],
  forum: [
    '217, 122, 122', // rose
    '232, 163, 90', // warm
    '154, 122, 217', // violet
  ],
  voice: [
    '154, 122, 217', // violet
    '109, 180, 214', // cool
    '116, 184, 111', // leaf
  ],
  widget: [
    '109, 180, 214', // cool
    '154, 122, 217', // violet
  ],
  game: [
    '217, 122, 122', // rose
    '232, 163, 90', // warm
    '116, 184, 111', // leaf
  ],
};

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hexToRgbString(hex: string): string | null {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return null;
  const n = parseInt(match[1]!, 16);
  return `${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}`;
}

export const CHANNEL_COLOR_PRESETS: { rgb: string; hex: string }[] = [
  { rgb: '116, 184, 111', hex: '#74b86f' },
  { rgb: '109, 180, 214', hex: '#6db4d6' },
  { rgb: '232, 163, 90', hex: '#e8a35a' },
  { rgb: '217, 122, 122', hex: '#d97a7a' },
  { rgb: '154, 122, 217', hex: '#9a7ad9' },
  { rgb: '122, 138, 168', hex: '#7a8aa8' },
  { rgb: '90, 140, 110', hex: '#5a8c6e' },
  { rgb: '186, 132, 90', hex: '#ba845a' },
];

export function accentRgb(type: string, id?: string): string {
  const palette = TYPE_HUES[type] ?? TYPE_HUES.text!;
  if (!id) return palette[0]!;
  return palette[hashString(id) % palette.length]!;
}

export function channelAccentRgb(ch: Pick<ChannelPublic, 'type' | 'id' | 'color'>): string {
  if (ch.color) {
    const rgb = hexToRgbString(ch.color);
    if (rgb) return rgb;
  }
  return accentRgb(ch.type, ch.id);
}

export function channelIconStyle(
  ch: Pick<ChannelPublic, 'type' | 'id' | 'color'>,
): Record<string, string> {
  const rgb = channelAccentRgb(ch);
  return {
    background: `linear-gradient(135deg, rgba(${rgb}, 1) 0%, rgba(${rgb}, 0.75) 100%)`,
    boxShadow: `inset 0 -2px 0 rgba(0, 0, 0, 0.18), 0 2px 6px rgba(${rgb}, 0.35)`,
  };
}

export function channelCardStyle(
  _ch: ChannelPublic,
  _bannerUrl: string | null,
): Record<string, string> {
  return {};
}

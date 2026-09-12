import type { PlayerEmote } from '@nookapp/protocol';

export type EmoteMotion = 'bounce' | 'wiggle';

export const EMOTES: { id: PlayerEmote; emoji: string; label: string; motion: EmoteMotion }[] = [
  { id: 'wave', emoji: '👋', label: 'Coucou', motion: 'bounce' },
  { id: 'dance', emoji: '💃', label: 'Danse', motion: 'wiggle' },
  { id: 'laugh', emoji: '😂', label: 'Rire', motion: 'bounce' },
  { id: 'heart', emoji: '❤️', label: 'Coeur', motion: 'bounce' },
  { id: 'party', emoji: '🎉', label: 'Fete', motion: 'wiggle' },
];

export const EMOTE_BUBBLE_MS = 2000;

export function emoteById(id: PlayerEmote) {
  return EMOTES.find((e) => e.id === id) ?? EMOTES[0]!;
}

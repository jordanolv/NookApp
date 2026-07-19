export type NameTagStatus = 'online' | 'busy' | 'away' | 'idle' | 'muted' | 'dnd';

export const NAME_TAG_STATUS_COLORS: Record<NameTagStatus, { bg: string; glow: string }> = {
  online: { bg: '#34d399', glow: 'rgba(52,211,153,0.7)' },
  busy: { bg: '#f87171', glow: 'rgba(248,113,113,0.7)' },
  away: { bg: '#fbbf24', glow: 'rgba(251,191,36,0.65)' },
  idle: { bg: '#9ca3af', glow: 'rgba(156,163,175,0.6)' },
  muted: { bg: '#fbbf24', glow: 'rgba(251,191,36,0.7)' },
  dnd: { bg: '#f87171', glow: 'rgba(248,113,113,0.75)' },
};

export const ICON_MUTED =
  '<svg width="10" height="10" viewBox="0 0 24 24" fill="rgb(248,113,113)" style="flex-shrink:0"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>';
export const ICON_DEAFENED =
  '<svg width="10" height="10" viewBox="0 0 24 24" fill="rgb(248,113,113)" style="flex-shrink:0"><path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9zM1 12l2 2 2-2-2-2-2 2zm18 0l2 2 2-2-2-2-2 2z"/></svg>';

export const ACTIVITY_STORAGE_KEY = 'nook:local-activity';
export const ACTIVITY_PRESETS = ['🎮', '🎧', '📚', '☕', '💻', '🍕', '✏️', '🎬'] as const;
export type ActivityPreset = (typeof ACTIVITY_PRESETS)[number];

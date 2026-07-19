import { afterEach, describe, expect, it, vi } from 'vitest';
import { Gamepad2, Hash, MessageSquare, Music, Sticker } from 'lucide-vue-next';
import {
  authorAvatarStyle,
  authorInitials,
  authorLabel,
  formatCount,
  formatRelativeTime,
  hueFor,
  iconForChannel,
  snippet,
} from '../../utils/channel-format';

describe('channel-format', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('iconForChannel', () => {
    it('resolves the default icon of each channel type', () => {
      expect(iconForChannel('text')).toBe(Hash);
      expect(iconForChannel('forum')).toBe(MessageSquare);
      expect(iconForChannel('game')).toBe(Gamepad2);
      expect(iconForChannel('widget')).toBe(Sticker);
    });

    it('prefers the channel custom icon over the type default', () => {
      expect(iconForChannel({ type: 'text', iconName: 'music' })).toBe(Music);
    });

    it('falls back to the type default when the custom icon name is unknown', () => {
      expect(iconForChannel({ type: 'game', iconName: 'not-an-icon' })).toBe(Gamepad2);
      expect(iconForChannel({ type: 'game', iconName: null })).toBe(Gamepad2);
    });
  });

  describe('snippet', () => {
    it('collapses every run of whitespace into a single space', () => {
      expect(snippet('  hello \n\t world  ')).toBe('hello world');
    });

    it('truncates with an ellipsis past the limit', () => {
      expect(snippet('abcdefghij', 5)).toBe('abcd…');
    });

    it('leaves a string of exactly the limit untouched', () => {
      expect(snippet('abcde', 5)).toBe('abcde');
    });

    it('returns an empty string for blank content', () => {
      expect(snippet('   \n  ')).toBe('');
    });
  });

  describe('formatCount', () => {
    it('prints counts below a thousand as-is', () => {
      expect(formatCount(0)).toBe('0');
      expect(formatCount(999)).toBe('999');
    });

    it('abbreviates thousands and drops a trailing zero decimal', () => {
      expect(formatCount(1000)).toBe('1k');
      expect(formatCount(1500)).toBe('1.5k');
      expect(formatCount(12_340)).toBe('12.3k');
    });
  });

  describe('formatRelativeTime', () => {
    const now = new Date('2026-07-19T12:00:00.000Z');

    function at(msAgo: number): string {
      return new Date(now.getTime() - msAgo).toISOString();
    }

    it('describes each elapsed bucket', () => {
      vi.useFakeTimers();
      vi.setSystemTime(now);
      expect(formatRelativeTime(at(30_000))).toBe("à l'instant");
      expect(formatRelativeTime(at(5 * 60_000))).toBe('5 min');
      expect(formatRelativeTime(at(3 * 3_600_000))).toBe('3 h');
      expect(formatRelativeTime(at(2 * 86_400_000))).toBe('2 j');
    });

    it('falls back to a calendar date beyond a week', () => {
      vi.useFakeTimers();
      vi.setSystemTime(now);
      expect(formatRelativeTime(at(10 * 86_400_000))).toBe('09/07');
    });

    it('clamps a future timestamp instead of printing a negative delta', () => {
      vi.useFakeTimers();
      vi.setSystemTime(now);
      expect(formatRelativeTime(new Date(now.getTime() + 60_000).toISOString())).toBe(
        "à l'instant",
      );
    });
  });

  describe('hueFor', () => {
    it('is deterministic and stays inside the hue circle', () => {
      expect(hueFor('channel-1')).toBe(hueFor('channel-1'));
      for (const id of ['a', 'channel-1', 'a-very-long-identifier-value']) {
        expect(hueFor(id)).toBeGreaterThanOrEqual(0);
        expect(hueFor(id)).toBeLessThan(360);
      }
    });

    it('returns 0 for an empty id', () => {
      expect(hueFor('')).toBe(0);
    });
  });

  describe('author helpers', () => {
    it('shortens an author id into a label and initials', () => {
      expect(authorLabel('0123456789abcdef')).toBe('@01234567');
      expect(authorInitials('0123456789abcdef')).toBe('01');
    });

    it('handles an id shorter than the truncation window', () => {
      expect(authorLabel('ab')).toBe('@ab');
      expect(authorInitials('a')).toBe('A');
    });

    it('builds a gradient background seeded by the author hue', () => {
      const style = authorAvatarStyle('author-1');
      expect(style.background).toContain(`hsl(${hueFor('author-1')}, 70%, 55%)`);
    });
  });
});

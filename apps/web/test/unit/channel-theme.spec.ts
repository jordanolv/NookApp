import { describe, expect, it } from 'vitest';
import type { ChannelPublic } from '@nookapp/protocol';
import {
  CHANNEL_COLOR_PRESETS,
  accentRgb,
  channelAccentRgb,
  channelIconStyle,
} from '../../utils/channel-theme';

const RGB = /^\d{1,3}, \d{1,3}, \d{1,3}$/;

function channel(overrides: Partial<Pick<ChannelPublic, 'type' | 'id' | 'color'>> = {}) {
  return { type: 'text' as ChannelPublic['type'], id: 'c1', color: null, ...overrides };
}

describe('channel-theme', () => {
  describe('accentRgb', () => {
    it('returns the head of the palette when no id seeds the hash', () => {
      expect(accentRgb('text')).toBe('116, 184, 111');
      expect(accentRgb('voice')).toBe('154, 122, 217');
    });

    it('picks a stable palette entry for a given id', () => {
      expect(accentRgb('text', 'c1')).toBe(accentRgb('text', 'c1'));
      expect(accentRgb('text', 'c1')).toMatch(RGB);
    });

    it('falls back to the text palette for an unknown channel type', () => {
      expect(accentRgb('unknown-type', 'c1')).toBe(accentRgb('text', 'c1'));
    });
  });

  describe('channelAccentRgb', () => {
    it('converts an explicit hex colour to rgb components', () => {
      expect(channelAccentRgb(channel({ color: '#74b86f' }))).toBe('116, 184, 111');
      expect(channelAccentRgb(channel({ color: '  #FFFFFF  ' }))).toBe('255, 255, 255');
    });

    it('ignores a malformed hex and falls back to the type palette', () => {
      expect(channelAccentRgb(channel({ color: 'red' }))).toBe(accentRgb('text', 'c1'));
      expect(channelAccentRgb(channel({ color: '#abc' }))).toBe(accentRgb('text', 'c1'));
    });

    it('resolves every documented preset back to its own rgb triplet', () => {
      for (const preset of CHANNEL_COLOR_PRESETS) {
        expect(channelAccentRgb(channel({ color: preset.hex }))).toBe(preset.rgb);
      }
    });
  });

  describe('channelIconStyle', () => {
    it('builds a gradient and shadow from the resolved accent', () => {
      const style = channelIconStyle(channel({ color: '#74b86f' }));
      expect(style.background).toBe(
        'linear-gradient(135deg, rgba(116, 184, 111, 1) 0%, rgba(116, 184, 111, 0.75) 100%)',
      );
      expect(style.boxShadow).toContain('rgba(116, 184, 111, 0.35)');
    });

    it('still produces a style when the channel has no colour', () => {
      const style = channelIconStyle(channel({ type: 'game', color: null }));
      expect(style.background).toContain('linear-gradient');
      expect(style.boxShadow).toBeTruthy();
    });
  });
});

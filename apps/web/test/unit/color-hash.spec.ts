import { describe, expect, it } from 'vitest';
import { COVER_GRADIENTS, gradientFor, hashString } from '../../utils/color-hash';

describe('color-hash', () => {
  describe('hashString', () => {
    it('is deterministic for the same seed', () => {
      expect(hashString('nook-1')).toBe(hashString('nook-1'));
    });

    it('separates two close seeds', () => {
      expect(hashString('nook-1')).not.toBe(hashString('nook-2'));
    });

    it('stays positive even when the rolling hash overflows to a negative int32', () => {
      // Long seeds are the ones that wrap past 2^31 via the `| 0` coercion.
      for (const seed of ['', 'a', 'a'.repeat(64), 'zzzzzzzzzzzzzzzzzzzz']) {
        expect(hashString(seed)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('gradientFor', () => {
    it('renders a css gradient taken from the preset palette', () => {
      const gradient = gradientFor('nook-1');
      const used = COVER_GRADIENTS.find(([a]) => gradient.includes(a));
      expect(used).toBeDefined();
      expect(gradient).toBe(`linear-gradient(135deg, ${used![0]} 0%, ${used![1]} 100%)`);
    });

    it('returns the same gradient for the same seed', () => {
      expect(gradientFor('nook-1')).toBe(gradientFor('nook-1'));
    });

    it('never falls off the end of the palette', () => {
      for (let i = 0; i < 200; i++) {
        expect(gradientFor(`seed-${i}`)).toMatch(/^linear-gradient\(135deg, #[0-9a-f]{6} 0%,/);
      }
    });
  });
});

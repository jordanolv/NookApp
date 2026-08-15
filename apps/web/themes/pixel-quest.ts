import type { ThemeDefinition } from './types';

/**
 * Pixel quest — retro 8-bit aesthetic.
 *
 * Square corners, blocky offset shadows, pixel font, no anti-aliasing.
 * Showcases how the theme system handles non-color customization (typography,
 * shapes, decorations). Structural rules live in styles/pixel-quest.css.
 */
export const pixelQuestTheme: ThemeDefinition = {
  id: 'pixel-quest',
  label: 'Pixel quest',
  description: 'Police 8-bit, formes carrées, ombres tranchées. Ambiance JRPG SNES.',
  isDark: true,
  tokens: {
    // Surfaces — warm dungeon browns
    surface: 'rgba(42, 31, 24, 0.85)',
    surfaceStrong: '#2a1f18',
    surfaceRaised: '#3a2d22',
    surfaceTinted: 'rgba(244, 228, 193, 0.06)',
    surfaceTintedStrong: 'rgba(244, 228, 193, 0.12)',
    surfaceBorder: 'rgba(244, 228, 193, 0.25)',
    surfaceDivider: 'rgba(244, 228, 193, 0.18)',
    surfaceTexture: 'none',
    surfaceGridLine: 'rgba(244, 228, 193, 0.05)',
    surfaceGridSize: '16px',

    // Page
    pageBg: '#0d0805',

    // Ink — old parchment cream
    ink: '#f4e4c1',
    inkSoft: '#e0c995',
    inkMuted: 'rgba(244, 228, 193, 0.65)',
    inkFaint: 'rgba(244, 228, 193, 0.53)',
    inkInverse: '#0d0805',

    // Shadows — hard block offsets, no blur (signature pixel look)
    shadowSoft: '3px 3px 0 rgba(0, 0, 0, 0.8)',
    shadowLift: '6px 6px 0 rgba(0, 0, 0, 0.9)',

    // Tooltip — inverted cream
    tooltipBg: '#f4e4c1',
    tooltipInk: '#0d0805',

    // In-world labels
    labelBg: '#2a1f18',
    labelInk: '#f4e4c1',
    labelRing: 'rgba(244, 228, 193, 0.5)',

    // Typography — Press Start 2P (loaded by styles/pixel-quest.css)
    fontBody: "'Press Start 2P', ui-monospace, Menlo, monospace",
    fontDisplay: "'Press Start 2P', ui-monospace, Menlo, monospace",
    fontMono: "'Press Start 2P', ui-monospace, Menlo, monospace",

    // Radii — pure squares, no curves
    radiusSm: '0',
    radiusMd: '0',
    radiusLg: '0',
    radiusCard: '0',
    radiusPill: '0',
    radiusTile: '0',

    // Borders & focus — thick visible borders
    borderWidth: '2px',
    focusRing: '0 0 0 3px #ffb84d',

    // Accent overrides — saturated retro palette
    accentLeaf: '#5cd86b',
    accentWarm: '#ffb84d',
    accentCool: '#5cc8ff',
    accentRose: '#ff5c8a',
    accentViolet: '#b85cff',
  },
};

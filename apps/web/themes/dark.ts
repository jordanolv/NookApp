import type { ThemeDefinition } from './types';

/**
 * Cozy night — muted dark mode.
 *
 * Deep neutral surfaces, cream ink, the same accent palette as light.
 * Tuned for evening sessions: low overall luminance, soft contrasts.
 */
export const darkTheme: ThemeDefinition = {
  id: 'dark',
  label: 'Cozy night',
  description: 'Mode sombre tamisé. Couleurs profondes, contrastes doux. Confort de soirée.',
  isDark: true,
  tokens: {
    // Surfaces
    surface: 'rgba(28, 32, 38, 0.58)',
    surfaceStrong: 'rgba(34, 38, 46, 0.78)',
    surfaceRaised: 'rgba(48, 54, 64, 0.5)',
    surfaceTinted: 'rgba(255, 255, 255, 0.06)',
    surfaceTintedStrong: 'rgba(255, 255, 255, 0.1)',
    surfaceBorder: 'rgba(255, 255, 255, 0.08)',
    surfaceDivider: 'rgba(255, 255, 255, 0.08)',
    surfaceTexture: 'none',
    surfaceGridLine: 'rgba(255, 255, 255, 0.04)',
    surfaceGridSize: '28px',

    // Page
    pageBg: '#0d1015',

    // Ink
    ink: '#f3eee2',
    inkSoft: '#e0d9c6',
    inkMuted: 'rgba(243, 238, 226, 0.6)',
    inkFaint: 'rgba(243, 238, 226, 0.35)',
    inkInverse: '#1d2a23',

    // Shadows
    shadowSoft: '0 10px 30px rgba(0, 0, 0, 0.5), 0 2px 6px rgba(0, 0, 0, 0.3)',
    shadowLift: '0 18px 48px rgba(0, 0, 0, 0.6), 0 4px 12px rgba(0, 0, 0, 0.35)',

    // Tooltip
    tooltipBg: 'rgba(245, 240, 230, 0.92)',
    tooltipInk: '#1d2a23',

    // In-world labels
    labelBg: 'rgba(28, 32, 38, 0.92)',
    labelInk: '#f3eee2',
    labelRing: 'rgba(255, 255, 255, 0.08)',

    // Typography — same family as light by default
    fontBody: "ui-rounded, 'SF Pro Rounded', system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontDisplay: "ui-rounded, 'SF Pro Rounded', system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontMono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",

    // Radii — same as light
    radiusSm: '8px',
    radiusMd: '12px',
    radiusLg: '18px',
    radiusCard: '22px',
    radiusPill: '999px',
    radiusTile: '14px',

    // Borders & focus
    borderWidth: '1px',
    focusRing: '0 0 0 3px rgba(116, 184, 111, 0.5)',
  },
};

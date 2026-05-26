import type { ThemeDefinition } from './types';

/**
 * Cozy paper — default daylight theme.
 *
 * Cream surfaces, dark forest-green ink, soft accents. Tuned for long
 * reading sessions and minimal eye strain in lit rooms.
 */
export const lightTheme: ThemeDefinition = {
  id: 'light',
  label: 'Cozy paper',
  description: 'Papier crème, accents tendres. Lecture longue agréable, idéal de jour.',
  isDark: false,
  tokens: {
    // Surfaces
    surface: 'rgba(255, 252, 244, 0.62)',
    surfaceStrong: 'rgba(255, 252, 244, 0.8)',
    surfaceRaised: 'rgba(255, 255, 255, 0.55)',
    surfaceTinted: 'rgba(29, 42, 35, 0.05)',
    surfaceTintedStrong: 'rgba(29, 42, 35, 0.09)',
    surfaceBorder: 'rgba(29, 42, 35, 0.08)',
    surfaceDivider: 'rgba(29, 42, 35, 0.1)',
    surfaceTexture: 'none',
    surfaceGridLine: 'rgba(29, 42, 35, 0.05)',
    surfaceGridSize: '28px',

    // Page
    pageBg: '#cdd0d4',

    // Ink
    ink: '#1d2a23',
    inkSoft: '#2d3d33',
    inkMuted: 'rgba(29, 42, 35, 0.55)',
    inkFaint: 'rgba(29, 42, 35, 0.35)',
    inkInverse: '#ffffff',

    // Shadows
    shadowSoft: '0 8px 28px rgba(20, 35, 25, 0.18), 0 2px 6px rgba(20, 35, 25, 0.08)',
    shadowLift: '0 14px 40px rgba(20, 35, 25, 0.28), 0 4px 10px rgba(20, 35, 25, 0.12)',

    // Tooltip
    tooltipBg: 'rgba(29, 42, 35, 0.92)',
    tooltipInk: '#ffffff',

    // In-world labels
    labelBg: 'rgba(255, 252, 244, 0.95)',
    labelInk: '#1d2a23',
    labelRing: 'rgba(29, 42, 35, 0.12)',

    // Typography
    fontBody: "ui-rounded, 'SF Pro Rounded', system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontDisplay: "ui-rounded, 'SF Pro Rounded', system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontMono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",

    // Radii
    radiusSm: '8px',
    radiusMd: '12px',
    radiusLg: '18px',
    radiusCard: '22px',
    radiusPill: '999px',
    radiusTile: '14px',

    // Borders & focus
    borderWidth: '1px',
    focusRing: '0 0 0 3px rgba(116, 184, 111, 0.35)',
  },
};

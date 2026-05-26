import type { ThemeDefinition, ThemeTokens } from './types';

// Internal — see `applyTheme(id)` in ./index.ts for the public entry point.

/**
 * Maps `ThemeTokens` keys → CSS custom property names.
 * Stay in sync with `types.ts`; TypeScript enforces total coverage.
 */
const CSS_VAR_MAP: Record<keyof ThemeTokens, string> = {
  // Surfaces
  surface: '--surface',
  surfaceStrong: '--surface-strong',
  surfaceRaised: '--surface-raised',
  surfaceTinted: '--surface-tinted',
  surfaceTintedStrong: '--surface-tinted-strong',
  surfaceBorder: '--surface-border',
  surfaceDivider: '--surface-divider',
  surfaceTexture: '--surface-texture',
  surfaceGridLine: '--surface-grid-line',
  surfaceGridSize: '--surface-grid-size',

  // Page
  pageBg: '--page-bg',

  // Ink
  ink: '--ink',
  inkSoft: '--ink-soft',
  inkMuted: '--ink-muted',
  inkFaint: '--ink-faint',
  inkInverse: '--ink-inverse',

  // Shadows
  shadowSoft: '--shadow-soft',
  shadowLift: '--shadow-lift',

  // Tooltip
  tooltipBg: '--tooltip-bg',
  tooltipInk: '--tooltip-ink',

  // Labels
  labelBg: '--label-bg',
  labelInk: '--label-ink',
  labelRing: '--label-ring',

  // Typography
  fontBody: '--font-body',
  fontDisplay: '--font-display',
  fontMono: '--font-mono',

  // Radii
  radiusCard: '--radius-card',
  radiusPill: '--radius-pill',
  radiusTile: '--radius-tile',
  radiusSm: '--radius-sm',
  radiusMd: '--radius-md',
  radiusLg: '--radius-lg',

  // Borders & focus
  borderWidth: '--border-width',
  focusRing: '--focus-ring',

  // Optional accents
  accentLeaf: '--accent-leaf',
  accentWarm: '--accent-warm',
  accentCool: '--accent-cool',
  accentRose: '--accent-rose',
  accentViolet: '--accent-violet',
};

/**
 * Apply a theme to the document root.
 *
 * - Writes every defined token to its CSS variable on `:root`.
 * - Removes optional tokens (accents) when the theme leaves them out so the
 *   shared defaults from `themes/styles/_shared.css` take over.
 * - Sets `data-theme` so theme CSS files can scope structural overrides.
 * - Toggles the `dark` class so Tailwind `dark:` variants follow.
 * - Updates `color-scheme` so native controls match.
 */
export function writeThemeToDocument(theme: ThemeDefinition): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  for (const key of Object.keys(CSS_VAR_MAP) as (keyof ThemeTokens)[]) {
    const value = theme.tokens[key];
    const cssVar = CSS_VAR_MAP[key];
    if (value === undefined) {
      root.style.removeProperty(cssVar);
    } else {
      root.style.setProperty(cssVar, value);
    }
  }

  root.dataset.theme = theme.id;
  root.classList.toggle('dark', theme.isDark);
  root.style.colorScheme = theme.isDark ? 'dark' : 'light';
}

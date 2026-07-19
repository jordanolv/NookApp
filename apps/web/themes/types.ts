/**
 * Shape of a theme's design tokens.
 *
 * Each key maps 1:1 to a CSS custom property (see `CSS_VAR_MAP` in apply.ts).
 * Tokens are flat strings (CSS values) — no logic. Components consume them
 * via `var(--token)`; switching themes just rewrites the values on `:root`.
 *
 * To add a token: extend this interface, add the CSS var name to CSS_VAR_MAP,
 * provide a value in every theme file, and use `var(--your-token)` in CSS.
 */
export interface ThemeTokens {
  // ─── Surfaces ─────────────────────────────────────────────────────────────
  surface: string;
  surfaceStrong: string;
  surfaceRaised: string;
  surfaceTinted: string;
  surfaceTintedStrong: string;
  surfaceBorder: string;
  surfaceDivider: string;

  // Texture overlay composable on surfaces (background-image fragment).
  // Use an empty string to disable: `'none'` or `''`.
  surfaceTexture: string;
  surfaceGridLine: string;
  surfaceGridSize: string;

  // ─── Page (full-window background, behind everything) ─────────────────────
  pageBg: string;

  // ─── Ink (text) ───────────────────────────────────────────────────────────
  ink: string;
  inkSoft: string;
  inkMuted: string;
  inkFaint: string;
  inkInverse: string;

  // ─── Shadows ──────────────────────────────────────────────────────────────
  shadowSoft: string;
  shadowLift: string;

  // ─── Tooltip ──────────────────────────────────────────────────────────────
  tooltipBg: string;
  tooltipInk: string;

  // ─── In-world overlay labels (name tags, voice room labels, etc.) ─────────
  labelBg: string;
  labelInk: string;
  labelRing: string;

  // ─── Typography ───────────────────────────────────────────────────────────
  fontBody: string;
  fontDisplay: string;
  fontMono: string;

  // ─── Radii ────────────────────────────────────────────────────────────────
  radiusCard: string;
  radiusPill: string;
  radiusTile: string;
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;

  // ─── Borders & focus ──────────────────────────────────────────────────────
  borderWidth: string;
  focusRing: string;

  // ─── Optional accent overrides ────────────────────────────────────────────
  // Themes may rebrand the accent palette; otherwise the shared defaults
  // from `themes/styles/_shared.css` apply.
  accentLeaf?: string;
  accentWarm?: string;
  accentCool?: string;
  accentRose?: string;
  accentViolet?: string;
}

export interface ThemeDefinition {
  /** Unique id used as `data-theme="..."` and the localStorage value. */
  id: string;
  /** Human label shown in the settings UI. */
  label: string;
  /** Short tagline shown under the label. */
  description: string;
  /**
   * True when paired with dark color scheme. Drives `color-scheme` + the
   * Tailwind `.dark` class so Tailwind `dark:` variants still work.
   */
  isDark: boolean;
  /** All design tokens. */
  tokens: ThemeTokens;
}

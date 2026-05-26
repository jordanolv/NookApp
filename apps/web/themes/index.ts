import type { ThemeDefinition } from './types';
import { writeThemeToDocument } from './apply';
import { lightTheme } from './light';
import { darkTheme } from './dark';
import { pixelQuestTheme } from './pixel-quest';

export type { ThemeDefinition, ThemeTokens } from './types';

/**
 * Theme registry — add a new theme:
 *
 *   1. Create `themes/<id>.ts` exporting a `ThemeDefinition`.
 *   2. Create `themes/styles/<id>.css` for structural overrides scoped with
 *      `[data-theme='<id>']` (font imports, pseudo-elements, custom shapes…).
 *   3. Import the theme module here and add it to `THEMES`.
 *   4. Add `@import './<id>.css';` to `themes/styles/index.css`.
 *
 * The id used in `data-theme` and in the settings UI is the object key.
 */
export const THEMES = {
  light: lightTheme,
  dark: darkTheme,
  'pixel-quest': pixelQuestTheme,
} as const satisfies Record<string, ThemeDefinition>;

export type ThemeId = keyof typeof THEMES;

type ThemeEntry = (typeof THEMES)[ThemeId] & { id: ThemeId };
export const THEME_LIST = Object.values(THEMES) as ThemeEntry[];

export const DEFAULT_THEME_ID: ThemeId = 'light';

export function isValidThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && value in THEMES;
}

export function getTheme(id: ThemeId): ThemeDefinition {
  return THEMES[id];
}

/** Apply a theme by id. Idempotent. SSR-safe (no-op on the server). */
export function applyTheme(id: ThemeId): void {
  writeThemeToDocument(THEMES[id] ?? THEMES[DEFAULT_THEME_ID]);
}

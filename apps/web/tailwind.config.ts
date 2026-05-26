import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue',
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      colors: {
        ink: 'var(--ink)',
        'ink-soft': 'var(--ink-soft)',
        'ink-muted': 'var(--ink-muted)',
        'ink-faint': 'var(--ink-faint)',
        'ink-inverse': 'var(--ink-inverse)',
        surface: 'var(--surface)',
        'surface-strong': 'var(--surface-strong)',
        'surface-raised': 'var(--surface-raised)',
        'surface-tinted': 'var(--surface-tinted)',
        'surface-tinted-strong': 'var(--surface-tinted-strong)',
        'surface-border': 'var(--surface-border)',
        'surface-divider': 'var(--surface-divider)',
        'accent-leaf': 'var(--accent-leaf)',
        'accent-warm': 'var(--accent-warm)',
        'accent-cool': 'var(--accent-cool)',
        'accent-rose': 'var(--accent-rose)',
        'accent-violet': 'var(--accent-violet)',
      },
    },
  },
  plugins: [],
} satisfies Config;

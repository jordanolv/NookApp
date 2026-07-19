import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    // Mirrors the Nuxt `~` alias so sources under test keep their own imports.
    alias: { '~': root },
  },
  test: {
    include: ['test/**/*.spec.ts'],
    environment: 'happy-dom',
  },
});

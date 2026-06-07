import { fileURLToPath } from 'node:url';

const protocolSrc = fileURLToPath(new URL('../../packages/protocol/src/index.ts', import.meta.url));

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt', '@nuxtjs/i18n'],
  css: ['~/assets/css/main.css'],
  i18n: {
    strategy: 'no_prefix',
    defaultLocale: 'fr',
    langDir: 'locales',
    locales: [
      { code: 'fr', name: 'Français', language: 'fr-FR', file: 'fr.json' },
      { code: 'en', name: 'English', language: 'en-US', file: 'en.json' },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'nookapp_locale',
      redirectOn: 'root',
      fallbackLocale: 'fr',
    },
  },
  routeRules: {
    '/': { prerender: true },
    '/legal/**': { prerender: true },
    '/auth/**': { ssr: true },
    '/app/**': { ssr: false },
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:4000/api/v1',
      authBase: process.env.NUXT_PUBLIC_AUTH_BASE ?? 'http://localhost:4000/api/auth',
      livekitUrl: process.env.NUXT_PUBLIC_LIVEKIT_URL ?? 'ws://localhost:7880',
      collabUrl: process.env.NUXT_PUBLIC_COLLAB_URL ?? 'ws://localhost:4234',
      giphyApiKey: process.env.NUXT_PUBLIC_GIPHY_API_KEY ?? '',
    },
  },
  typescript: {
    strict: true,
    typeCheck: false,
  },
  // @nookapp/protocol's CJS build chain confuses Rollup's static analysis; resolve to source TS instead.
  alias: {
    '@nookapp/protocol': protocolSrc,
  },
  vite: {
    optimizeDeps: {
      include: ['yjs', '@hocuspocus/provider'],
    },
  },
});

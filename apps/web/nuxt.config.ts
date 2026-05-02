export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  routeRules: {
    '/': { prerender: true },
    '/auth/**': { ssr: true },
    '/app/**': { ssr: false },
  },
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:3000/api/v1',
      authBase: process.env.NUXT_PUBLIC_AUTH_BASE ?? 'http://localhost:3000/api/auth',
      livekitUrl: process.env.NUXT_PUBLIC_LIVEKIT_URL ?? 'ws://localhost:7880',
    },
  },
  typescript: {
    strict: true,
    typeCheck: false,
  },
});

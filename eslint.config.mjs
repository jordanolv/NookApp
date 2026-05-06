import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import vueparser from 'vue-eslint-parser';
import vueplugin from 'eslint-plugin-vue';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

const nodeGlobals = {
  ...globals.node,
  ...globals.es2022,
};

const browserGlobals = {
  ...globals.browser,
  ...globals.es2022,
};

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.nuxt/**',
      '**/.output/**',
      '**/.cache/**',
      'apps/web/public/assets/**',
      'assets-source/**',
      'packages/db/drizzle/**',
      'apps/web/.data/**',
      '**/*.d.ts',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      globals: nodeGlobals,
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-undef': 'off',
    },
  },
  {
    files: ['apps/web/**/*.{ts,vue}'],
    languageOptions: {
      globals: {
        ...browserGlobals,
        // Nuxt auto-imports
        defineNuxtConfig: 'readonly',
        defineNuxtPlugin: 'readonly',
        defineNuxtRouteMiddleware: 'readonly',
        definePageMeta: 'readonly',
        useHead: 'readonly',
        useSeoMeta: 'readonly',
        useRoute: 'readonly',
        useRouter: 'readonly',
        useRuntimeConfig: 'readonly',
        useState: 'readonly',
        useFetch: 'readonly',
        useAsyncData: 'readonly',
        useNuxtApp: 'readonly',
        navigateTo: 'readonly',
        createError: 'readonly',
        // Vue auto-imports
        ref: 'readonly',
        shallowRef: 'readonly',
        reactive: 'readonly',
        readonly: 'readonly',
        computed: 'readonly',
        watch: 'readonly',
        watchEffect: 'readonly',
        onMounted: 'readonly',
        onUnmounted: 'readonly',
        onBeforeMount: 'readonly',
        onBeforeUnmount: 'readonly',
        nextTick: 'readonly',
        // Project composables
        useAuth: 'readonly',
        useAuthStore: 'readonly',
        useApi: 'readonly',
        useServers: 'readonly',
        useChannels: 'readonly',
        useMessages: 'readonly',
        useSocket: 'readonly',
        useVoice: 'readonly',
        usePlugins: 'readonly',
        useInvites: 'readonly',
        useMember: 'readonly',
        useMap: 'readonly',
        useCategories: 'readonly',
        useChannelIcons: 'readonly',
        useServersStore: 'readonly',
        useUiLayout: 'readonly',
        useI18n: 'readonly',
        $fetch: 'readonly',
        // Pinia
        defineStore: 'readonly',
      },
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueparser,
      parserOptions: {
        parser: tsparser,
        ecmaVersion: 2022,
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
      globals: browserGlobals,
    },
    plugins: { vue: vueplugin },
    rules: {
      ...vueplugin.configs['flat/recommended'].rules,
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['**/*.{cjs,js}'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: nodeGlobals,
    },
  },
  prettier,
];

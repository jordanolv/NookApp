<script setup lang="ts">
import { Sun, Moon } from 'lucide-vue-next';
import { useInterfacePreferences } from '~/composables/useInterfacePreferences';

const { t } = useI18n();
const prefs = useInterfacePreferences();

const isDark = computed(() => prefs.prefs.value.theme === 'dark');
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white p-2 text-neutral-700 shadow-sm transition-colors hover:text-neutral-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:text-white"
    :aria-label="t('settings.user.appearance.theme.title')"
    :aria-pressed="isDark"
    :title="
      t(isDark ? 'settings.user.appearance.theme.light' : 'settings.user.appearance.theme.dark')
    "
    @click="prefs.toggleTheme()"
  >
    <component :is="isDark ? Sun : Moon" :size="14" :stroke-width="2" />
  </button>
</template>

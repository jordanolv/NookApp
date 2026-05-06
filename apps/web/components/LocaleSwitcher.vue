<script setup lang="ts">
const { locale, setLocale, t } = useI18n();

const options = [
  { code: 'fr', label: 'FR', titleKey: 'locale.fr' },
  { code: 'en', label: 'EN', titleKey: 'locale.en' },
] as const;
</script>

<template>
  <div
    class="inline-flex rounded-lg border border-neutral-200 bg-white p-1 text-xs font-semibold shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
    :aria-label="t('common.language')"
  >
    <button
      v-for="option in options"
      :key="option.code"
      type="button"
      class="rounded-md px-2.5 py-1 transition-colors"
      :class="
        locale === option.code
          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950'
          : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white'
      "
      :aria-pressed="locale === option.code"
      :title="t(option.titleKey)"
      @click="setLocale(option.code)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

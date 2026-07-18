<script setup lang="ts">
const { locale } = useI18n();
// RGAA 8.3 / OPQUAST 20: la langue du document suit la locale active.
useHead({ htmlAttrs: { lang: () => locale.value } });
</script>

<template>
  <a href="#main-content" class="skip-link">Aller au contenu principal</a>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

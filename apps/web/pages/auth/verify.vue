<script setup lang="ts">
const { t } = useI18n();

useHead(() => ({ title: t('auth.verify.title') }));

const route = useRoute();
const email = computed(() => route.query.email as string | undefined);
</script>

<template>
  <main class="mx-auto max-w-md px-6 py-16 text-center">
    <div class="mb-6 text-5xl">📬</div>
    <h1 class="mb-3 text-3xl font-bold">{{ t('auth.verify.heading') }}</h1>
    <p class="text-neutral-500">
      {{ t('auth.verify.sentPrefix') }}
      <span v-if="email" class="font-medium text-neutral-800 dark:text-neutral-200">{{
        email
      }}</span
      ><span v-else>{{ t('auth.verify.fallbackEmail') }}</span
      >. {{ t('auth.verify.sentSuffix') }}
    </p>
    <p class="mt-6 text-sm text-neutral-400">
      {{ t('auth.verify.alreadyVerified') }}
      <NuxtLink to="/auth/login" class="text-indigo-600 hover:underline">{{
        t('common.signIn')
      }}</NuxtLink>
    </p>
  </main>
</template>

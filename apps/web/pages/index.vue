<script setup lang="ts">
useHead({ title: 'NookApp — your virtual office' });
</script>

<template>
  <main class="mx-auto flex max-w-3xl flex-col items-center gap-8 px-6 py-24 text-center">
    <h1 class="text-5xl font-black tracking-tight">NookApp</h1>
    <p class="text-lg text-neutral-600 dark:text-neutral-400">
      A pixel-art virtual office for small teams. Build your map, hop on voice, run plugins.
    </p>
    <div class="flex gap-3">
      <NuxtLink
        to="/auth/register"
        class="rounded-lg bg-neutral-900 px-5 py-2.5 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        Get started
      </NuxtLink>
      <NuxtLink
        to="/auth/login"
        class="rounded-lg border border-neutral-300 px-5 py-2.5 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
      >
        Sign in
      </NuxtLink>
    </div>
  </main>
</template>

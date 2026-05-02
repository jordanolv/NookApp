<script setup lang="ts">
useHead({ title: 'Verify email — NookApp' });

const route = useRoute();
const email = computed(() => route.query.email as string | undefined);
</script>

<template>
  <main class="mx-auto max-w-md px-6 py-16 text-center">
    <div class="mb-6 text-5xl">📬</div>
    <h1 class="mb-3 text-3xl font-bold">Check your inbox</h1>
    <p class="text-neutral-500">
      We sent a verification link to
      <span v-if="email" class="font-medium text-neutral-800 dark:text-neutral-200">{{
        email
      }}</span
      ><span v-else>your email address</span>. Click it to activate your account.
    </p>
    <p class="mt-6 text-sm text-neutral-400">
      Already verified?
      <NuxtLink to="/auth/login" class="text-indigo-600 hover:underline">Sign in</NuxtLink>
    </p>
  </main>
</template>

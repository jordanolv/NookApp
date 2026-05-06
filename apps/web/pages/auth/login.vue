<script setup lang="ts">
const { t } = useI18n();

useHead(() => ({ title: t('auth.login.title') }));

const { signIn } = useAuth();
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function onSubmit() {
  error.value = '';
  loading.value = true;
  try {
    await signIn(email.value, password.value);
    await navigateTo('/app');
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string } })?.data?.message;
    error.value = msg ?? t('auth.login.invalidCredentials');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="mx-auto max-w-md px-6 py-16">
    <h1 class="mb-2 text-3xl font-bold">{{ t('auth.login.heading') }}</h1>
    <p class="mb-8 text-neutral-500">
      {{ t('auth.login.noAccount') }}
      <NuxtLink to="/auth/register" class="text-indigo-600 hover:underline">{{
        t('auth.login.createOne')
      }}</NuxtLink>
    </p>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="mb-1 block text-sm font-medium" for="email">{{ t('common.email') }}</label>
        <input
          id="email"
          v-model="email"
          type="email"
          required
          autocomplete="email"
          class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium" for="password">{{
          t('common.password')
        }}</label>
        <input
          id="password"
          v-model="password"
          type="password"
          required
          autocomplete="current-password"
          class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {{ loading ? t('auth.login.submitLoading') : t('common.signIn') }}
      </button>
    </form>
  </main>
</template>

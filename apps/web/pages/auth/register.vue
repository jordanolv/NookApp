<script setup lang="ts">
const { t } = useI18n();

useHead(() => ({ title: t('auth.register.title') }));

const { signUp } = useAuth();
const name = ref('');
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function onSubmit() {
  error.value = '';
  loading.value = true;
  try {
    await signUp(name.value, email.value, password.value);
    await navigateTo(`/auth/verify?email=${encodeURIComponent(email.value)}`);
  } catch (e: unknown) {
    console.error('[register] error:', e);
    const err = e as { data?: { message?: string }; message?: string };
    error.value = err?.data?.message ?? err?.message ?? t('auth.register.failed');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="mx-auto max-w-md px-6 py-16">
    <h1 class="mb-2 text-3xl font-bold">{{ t('auth.register.heading') }}</h1>
    <p class="mb-8 text-neutral-500">
      {{ t('auth.register.alreadyHaveAccount') }}
      <NuxtLink to="/auth/login" class="text-indigo-600 hover:underline">{{
        t('common.signIn')
      }}</NuxtLink>
    </p>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="mb-1 block text-sm font-medium" for="name">{{
          t('auth.register.displayName')
        }}</label>
        <input
          id="name"
          v-model="name"
          type="text"
          required
          minlength="2"
          maxlength="32"
          autocomplete="name"
          class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

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
          minlength="12"
          autocomplete="new-password"
          class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <p class="mt-1 text-xs text-neutral-400">{{ t('auth.register.passwordHint') }}</p>
      </div>

      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {{ loading ? t('auth.register.submitLoading') : t('auth.register.submit') }}
      </button>
    </form>
  </main>
</template>

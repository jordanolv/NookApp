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
  <main class="auth">
    <div class="auth__grid" aria-hidden="true" />
    <div class="auth__blob auth__blob--a" aria-hidden="true" />
    <div class="auth__blob auth__blob--b" aria-hidden="true" />

    <section class="auth__card">
      <header class="auth__header">
        <NuxtLink to="/" class="auth__tagline">
          <span class="auth__tagline-dot" aria-hidden="true" />
          NookApp
        </NuxtLink>
        <h1 class="auth__headline">{{ t('auth.login.heading') }}</h1>
        <p class="auth__description">
          {{ t('auth.login.noAccount') }}
          <NuxtLink to="/auth/register" class="auth__link">
            {{ t('auth.login.createOne') }}
          </NuxtLink>
        </p>
      </header>

      <form class="auth__form" @submit.prevent="onSubmit">
        <div class="auth__field">
          <label class="auth__label" for="email">{{ t('common.email') }}</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            :aria-invalid="error ? 'true' : undefined"
            :aria-describedby="error ? 'form-error' : undefined"
            autocomplete="email"
            class="auth__input"
          />
        </div>

        <div class="auth__field">
          <label class="auth__label" for="password">{{ t('common.password') }}</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            :aria-invalid="error ? 'true' : undefined"
            :aria-describedby="error ? 'form-error' : undefined"
            autocomplete="current-password"
            class="auth__input"
          />
        </div>

        <p v-if="error" id="form-error" role="alert" class="auth__error">{{ error }}</p>

        <div class="auth__row">
          <NuxtLink to="/auth/forgot-password" class="auth__link auth__link--small">
            {{ t('auth.login.forgotPassword') }}
          </NuxtLink>
        </div>

        <button type="submit" :disabled="loading" class="auth__btn auth__btn--primary">
          {{ loading ? t('auth.login.submitLoading') : t('common.signIn') }}
        </button>
      </form>
    </section>
  </main>
</template>

<style scoped>
.auth {
  position: relative;
  min-height: 100vh;
  padding: 64px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink);
  overflow: hidden;
}

.auth__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--surface-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--surface-border) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(ellipse at 50% 30%, #000 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 30%, #000 30%, transparent 75%);
  pointer-events: none;
  opacity: 0.65;
}

.auth__blob {
  position: absolute;
  width: 480px;
  height: 480px;
  border-radius: 999px;
  filter: blur(80px);
  pointer-events: none;
  opacity: 0.45;
}
.auth__blob--a {
  top: -140px;
  left: -140px;
  background: var(--accent-leaf-soft);
}
.auth__blob--b {
  bottom: -160px;
  right: -160px;
  background: var(--accent-violet-soft);
}

.auth__card {
  position: relative;
  width: 100%;
  max-width: 440px;
  padding: 36px 32px;
  border-radius: 20px;
  background: var(--surface-strong);
  border: 1px solid var(--surface-border);
  backdrop-filter: blur(10px);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.auth__header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.auth__tagline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--surface-raised);
  border: 1px solid var(--surface-border);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--ink-soft);
}
.auth__tagline-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--accent-leaf);
  box-shadow: 0 0 0 3px var(--accent-leaf-soft);
}

.auth__headline {
  font-size: clamp(28px, 4vw, 36px);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin: 0;
}

.auth__description {
  font-size: 14px;
  line-height: 1.55;
  color: var(--ink-muted);
  margin: 0;
}

.auth__link {
  color: var(--ink);
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: var(--surface-border);
  text-underline-offset: 3px;
  transition: text-decoration-color 0.15s ease;
}
.auth__link:hover {
  text-decoration-color: var(--ink);
}
.auth__link--small {
  font-size: 12px;
  color: var(--ink-muted);
  font-weight: 500;
}

.auth__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auth__label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-soft);
  letter-spacing: 0.02em;
}

.auth__input {
  width: 100%;
  padding: 11px 14px;
  border-radius: 12px;
  border: 1px solid var(--surface-border);
  background: var(--surface-raised);
  color: var(--ink);
  font-size: 14px;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}
.auth__input:focus {
  outline: none;
  border-color: var(--ink);
  background: var(--surface-strong);
}

.auth__row {
  display: flex;
  justify-content: flex-end;
}

.auth__error {
  font-size: 13px;
  color: var(--accent-rose);
  margin: 0;
}

.auth__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 22px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid transparent;
  transition:
    transform 0.15s ease,
    background 0.15s ease;
  cursor: pointer;
}
.auth__btn:hover:not(:disabled) {
  transform: translateY(-1px);
}
.auth__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.auth__btn--primary {
  background: var(--ink);
  color: var(--ink-inverse);
}
.auth__btn--primary:hover:not(:disabled) {
  background: var(--ink-soft);
}
</style>

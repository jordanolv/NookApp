<script setup lang="ts">
const { t } = useI18n();
const route = useRoute();

useHead(() => ({ title: t('auth.resetPassword.title') }));

const { resetPassword } = useAuth();
const password = ref('');
const confirm = ref('');
const error = ref('');
const success = ref(false);
const loading = ref(false);

const token = computed(() => {
  const raw = route.query.token;
  return typeof raw === 'string' ? raw : '';
});

async function onSubmit() {
  error.value = '';

  if (!token.value) {
    error.value = t('auth.resetPassword.missingToken');
    return;
  }
  if (password.value !== confirm.value) {
    error.value = t('auth.resetPassword.mismatch');
    return;
  }

  loading.value = true;
  try {
    await resetPassword(token.value, password.value);
    success.value = true;
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string } })?.data?.message;
    error.value = msg ?? t('auth.resetPassword.failed');
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
        <h1 class="auth__headline">{{ t('auth.resetPassword.heading') }}</h1>
      </header>

      <div v-if="success" class="auth__notice">
        <p class="auth__notice-text">{{ t('auth.resetPassword.success') }}</p>
        <NuxtLink to="/auth/login" class="auth__link">
          {{ t('auth.resetPassword.goToLogin') }}
        </NuxtLink>
      </div>

      <form v-else class="auth__form" @submit.prevent="onSubmit">
        <div class="auth__field">
          <label class="auth__label" for="password">
            {{ t('auth.resetPassword.newPassword') }}
          </label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            :aria-invalid="error ? 'true' : undefined"
            :aria-describedby="error ? 'form-error' : undefined"
            minlength="12"
            autocomplete="new-password"
            class="auth__input"
          />
          <p class="auth__hint">{{ t('auth.register.passwordHint') }}</p>
        </div>

        <div class="auth__field">
          <label class="auth__label" for="confirm">
            {{ t('auth.resetPassword.confirmPassword') }}
          </label>
          <input
            id="confirm"
            v-model="confirm"
            type="password"
            required
            :aria-invalid="error ? 'true' : undefined"
            :aria-describedby="error ? 'form-error' : undefined"
            minlength="12"
            autocomplete="new-password"
            class="auth__input"
          />
        </div>

        <p v-if="error" id="form-error" role="alert" class="auth__error">{{ error }}</p>

        <button type="submit" :disabled="loading || !token" class="auth__btn auth__btn--primary">
          {{ loading ? t('auth.resetPassword.submitLoading') : t('auth.resetPassword.submit') }}
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

.auth__hint {
  font-size: 12px;
  color: var(--ink-muted);
  margin: 0;
}

.auth__error {
  font-size: 13px;
  color: var(--accent-rose);
  margin: 0;
}

.auth__notice {
  padding: 16px;
  border-radius: 12px;
  background: var(--accent-leaf-soft);
  border: 1px solid var(--surface-border);
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink);
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}
.auth__notice-text {
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

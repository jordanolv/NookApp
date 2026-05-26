<script setup lang="ts">
const { t } = useI18n();
const { isAuthenticated, ready } = useAuth();
</script>

<template>
  <ClientOnly>
    <NuxtLink v-if="ready && isAuthenticated" to="/app" class="public-cta public-cta--primary">
      <span class="public-cta__dot" aria-hidden="true" />
      {{ t('home.myNooks') }}
    </NuxtLink>
    <NuxtLink v-else to="/auth/login" class="public-cta">
      {{ t('common.signIn') }}
    </NuxtLink>
  </ClientOnly>
</template>

<style scoped>
.public-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  background: var(--surface-strong);
  border: 1px solid var(--surface-border);
  backdrop-filter: blur(8px);
  transition:
    background 0.15s ease,
    transform 0.15s ease,
    border-color 0.15s ease;
}
.public-cta:hover {
  background: var(--surface-raised);
  border-color: var(--surface-divider);
}
.public-cta--primary {
  color: var(--ink-inverse);
  background: var(--ink);
  border-color: var(--ink);
}
.public-cta--primary:hover {
  background: var(--ink-soft);
  border-color: var(--ink-soft);
}
.public-cta__dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--accent-leaf);
  box-shadow: 0 0 0 3px var(--accent-leaf-soft);
}
</style>

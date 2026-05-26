<script setup lang="ts">
const { t } = useI18n();
const { isAuthenticated, ready } = useAuth();

useHead(() => ({ title: t('home.title') }));

const features = computed(() => [
  {
    key: 'world',
    accent: 'leaf',
    emoji: '🏗️',
    title: t('home.features.world.title'),
    body: t('home.features.world.body'),
  },
  {
    key: 'voice',
    accent: 'cool',
    emoji: '🎙️',
    title: t('home.features.voice.title'),
    body: t('home.features.voice.body'),
  },
  {
    key: 'plugins',
    accent: 'violet',
    emoji: '🧩',
    title: t('home.features.plugins.title'),
    body: t('home.features.plugins.body'),
  },
]);
</script>

<template>
  <main class="landing">
    <div class="landing__grid" aria-hidden="true" />
    <div class="landing__blob landing__blob--a" aria-hidden="true" />
    <div class="landing__blob landing__blob--b" aria-hidden="true" />

    <section class="landing__hero">
      <span class="landing__tagline">
        <span class="landing__tagline-dot" aria-hidden="true" />
        {{ t('home.tagline') }}
      </span>
      <h1 class="landing__headline">{{ t('home.headline') }}</h1>
      <p class="landing__description">{{ t('home.description') }}</p>

      <ClientOnly>
        <div class="landing__cta">
          <template v-if="ready && isAuthenticated">
            <NuxtLink to="/app" class="landing__btn landing__btn--primary">
              {{ t('home.myNooks') }}
            </NuxtLink>
          </template>
          <template v-else>
            <NuxtLink to="/auth/register" class="landing__btn landing__btn--primary">
              {{ t('home.getStarted') }}
            </NuxtLink>
            <NuxtLink to="/auth/login" class="landing__btn landing__btn--ghost">
              {{ t('home.alreadyHaveAccount') }}
            </NuxtLink>
          </template>
        </div>
      </ClientOnly>
    </section>

    <section class="landing__features" :aria-label="t('home.tagline')">
      <article v-for="f in features" :key="f.key" class="feature" :data-accent="f.accent">
        <div class="feature__icon">{{ f.emoji }}</div>
        <h3 class="feature__title">{{ f.title }}</h3>
        <p class="feature__body">{{ f.body }}</p>
      </article>
    </section>

    <footer class="landing__footer">{{ t('home.footer') }}</footer>
  </main>
</template>

<style scoped>
.landing {
  position: relative;
  min-height: 100vh;
  padding: 96px 24px 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 64px;
  color: var(--ink);
  overflow: hidden;
}

.landing__grid {
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

.landing__blob {
  position: absolute;
  width: 480px;
  height: 480px;
  border-radius: 999px;
  filter: blur(80px);
  pointer-events: none;
  opacity: 0.45;
}
.landing__blob--a {
  top: -120px;
  left: -120px;
  background: var(--accent-leaf-soft);
}
.landing__blob--b {
  top: 120px;
  right: -160px;
  background: var(--accent-violet-soft);
}

.landing__hero {
  position: relative;
  max-width: 720px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.landing__tagline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--surface-strong);
  border: 1px solid var(--surface-border);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--ink-soft);
}
.landing__tagline-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--accent-leaf);
  box-shadow: 0 0 0 3px var(--accent-leaf-soft);
}

.landing__headline {
  font-size: clamp(40px, 6vw, 64px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.02em;
  margin: 0;
}

.landing__description {
  font-size: 18px;
  line-height: 1.55;
  max-width: 560px;
  color: var(--ink-muted);
  margin: 0;
}

.landing__cta {
  margin-top: 12px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.landing__btn {
  display: inline-flex;
  align-items: center;
  padding: 12px 22px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  border: 1px solid transparent;
  transition:
    transform 0.15s ease,
    background 0.15s ease,
    border-color 0.15s ease;
}
.landing__btn:hover {
  transform: translateY(-1px);
}
.landing__btn--primary {
  background: var(--ink);
  color: var(--ink-inverse);
}
.landing__btn--primary:hover {
  background: var(--ink-soft);
}
.landing__btn--ghost {
  background: var(--surface-strong);
  border-color: var(--surface-border);
  color: var(--ink);
}
.landing__btn--ghost:hover {
  background: var(--surface-raised);
}

.landing__features {
  position: relative;
  width: 100%;
  max-width: 1040px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.feature {
  position: relative;
  padding: 22px 22px 24px;
  border-radius: 16px;
  background: var(--surface-strong);
  border: 1px solid var(--surface-border);
  display: flex;
  flex-direction: column;
  gap: 10px;
  backdrop-filter: blur(10px);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}
.feature:hover {
  transform: translateY(-2px);
  background: var(--surface-raised);
}

.feature__icon {
  font-size: 28px;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--surface-tinted);
}
.feature[data-accent='leaf'] .feature__icon {
  background: var(--accent-leaf-soft);
}
.feature[data-accent='cool'] .feature__icon {
  background: var(--accent-cool-soft);
}
.feature[data-accent='violet'] .feature__icon {
  background: var(--accent-violet-soft);
}

.feature__title {
  font-size: 16px;
  font-weight: 700;
  margin: 0;
  color: var(--ink);
}

.feature__body {
  font-size: 14px;
  line-height: 1.55;
  color: var(--ink-muted);
  margin: 0;
}

.landing__footer {
  position: relative;
  font-size: 12px;
  color: var(--ink-faint);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>

<script setup lang="ts">
import { Sparkles, Pencil, Users } from 'lucide-vue-next';

defineProps<{
  name: string | null | undefined;
  bannerUrl: string | null;
  iconUrl: string | null;
  onlineCount: number;
  channelCount: number;
}>();
</script>

<template>
  <header class="banner">
    <div class="banner__media">
      <img v-if="bannerUrl" :src="bannerUrl" :alt="name ?? ''" />
      <div v-else class="banner__media-fallback">
        <Sparkles :size="28" :stroke-width="1.5" />
      </div>
    </div>
    <div class="banner__overlay" />
    <div class="banner__content">
      <div class="banner__row">
        <div class="banner__icon">
          <img v-if="iconUrl" :src="iconUrl" :alt="name ?? ''" />
          <span v-else>{{ name?.[0]?.toUpperCase() ?? '?' }}</span>
        </div>
        <div class="banner__title">
          <h1>{{ name ?? 'Server' }}</h1>
          <p class="banner__stats">
            <span class="banner__stat">
              <span class="banner__stat-dot banner__stat-dot--green" />
              {{ onlineCount }} en ligne
            </span>
            <span class="banner__stat-sep">·</span>
            <span class="banner__stat">
              <Users :size="11" :stroke-width="2.2" />
              {{ channelCount }} canaux
            </span>
          </p>
        </div>
        <button class="banner__edit" type="button" disabled title="Bientôt — personnaliser ta home">
          <Pencil :size="13" :stroke-width="2" />
          <span>Personnaliser</span>
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.banner {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
  background: rgba(15, 16, 24, 0.9);
}

.banner__media {
  width: 100%;
  height: 180px;
  background: linear-gradient(135deg, #4338ca, #6366f1);
  position: relative;
}

.banner__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.banner__media-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.45);
}

.banner__overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, 0.55) 75%, rgba(0, 0, 0, 0.85)),
    linear-gradient(180deg, rgba(15, 16, 24, 0) 50%, rgba(15, 16, 24, 0.4));
  pointer-events: none;
}

.banner__content {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16px 22px;
}

.banner__row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.banner__icon {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 22px;
  font-weight: 700;
  border: 2px solid rgba(0, 0, 0, 0.5);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.banner__icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.banner__title {
  flex: 1;
  min-width: 0;
}

.banner__title h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: white;
  letter-spacing: -0.01em;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
}

.banner__stats {
  margin: 4px 0 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
}

.banner__stat {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.banner__stat-sep {
  color: rgba(255, 255, 255, 0.3);
}

.banner__stat-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
}

.banner__stat-dot--green {
  background: #22c55e;
  box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);
}

.banner__edit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: pointer;
  transition:
    background 120ms,
    color 120ms;
}

.banner__edit:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.banner__edit:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.16);
}
</style>

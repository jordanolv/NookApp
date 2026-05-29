<script setup lang="ts">
import type { Appearance } from '~/composables/useCharacter';
import { walkFrames, CG_WALK_FRAME_RATE } from '~/utils/cg-sheet';

const props = defineProps<{
  phase: 'assets' | 'building' | 'syncing';
  assetsProgress: number;
  appearance: Appearance;
}>();

const WALK_DOWN_FRAMES = walkFrames('down');
const walkFrame = ref(WALK_DOWN_FRAMES[0]);
let walkTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  let i = 0;
  walkTimer = setInterval(() => {
    i = (i + 1) % WALK_DOWN_FRAMES.length;
    walkFrame.value = WALK_DOWN_FRAMES[i];
  }, 1000 / CG_WALK_FRAME_RATE);
});

onUnmounted(() => {
  if (walkTimer) clearInterval(walkTimer);
  walkTimer = null;
});

const phaseLabel = computed(() => {
  switch (props.phase) {
    case 'assets':
      return 'Chargement des décors';
    case 'building':
      return 'Construction du monde';
    case 'syncing':
      return 'Synchronisation';
  }
  return '';
});

const overallProgress = computed(() => {
  if (props.phase === 'assets') return 5 + Math.min(1, Math.max(0, props.assetsProgress)) * 65;
  if (props.phase === 'building') return 80;
  return 92;
});

const dotCount = ref(1);
let dotTimer: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  dotTimer = setInterval(() => {
    dotCount.value = (dotCount.value % 3) + 1;
  }, 400);
});
onUnmounted(() => {
  if (dotTimer) clearInterval(dotTimer);
  dotTimer = null;
});
const dots = computed(() => '.'.repeat(dotCount.value));
</script>

<template>
  <div class="loading-overlay">
    <div class="loading-card">
      <div class="walker">
        <UserCharacterPreview :appearance="appearance" :frame="walkFrame" :scale="4" />
      </div>

      <div class="step">
        <span class="step-label">{{ phaseLabel }}</span>
        <span class="step-dots">{{ dots }}</span>
      </div>

      <div class="bar">
        <div class="bar-fill" :style="{ width: `${overallProgress}%` }" />
      </div>

      <div class="hint">Nookapp prépare ton bureau virtuel</div>
    </div>
  </div>
</template>

<style scoped>
.loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--page-bg) 70%, transparent);
  backdrop-filter: blur(6px);
  animation: fade-in 200ms ease-out;
}

.loading-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 28px 36px;
  min-width: 280px;
  background: var(--surface-strong);
  border: 1px solid var(--surface-border);
  border-radius: 14px;
  box-shadow:
    0 24px 60px -20px rgba(0, 0, 0, 0.35),
    0 2px 6px rgba(0, 0, 0, 0.08);
  color: var(--ink);
}

.walker {
  padding: 6px 10px 0;
  animation: bob 700ms ease-in-out infinite;
}

@keyframes bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

.step {
  display: flex;
  align-items: baseline;
  gap: 2px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.step-dots {
  width: 1.2em;
  text-align: left;
  opacity: 0.7;
}

.bar {
  width: 220px;
  height: 8px;
  background: var(--surface-tinted, color-mix(in srgb, var(--ink) 8%, transparent));
  border-radius: 999px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--ink) 60%, #6366f1) 0%, #818cf8 100%);
  transition: width 220ms ease-out;
}

.hint {
  font-size: 11px;
  letter-spacing: 0.02em;
  opacity: 0.55;
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>

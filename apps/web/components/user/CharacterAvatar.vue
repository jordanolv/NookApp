<script setup lang="ts">
import type { Appearance } from '~/composables/useCharacter';
import { CG_FRAME_W } from '~/utils/cg-sheet';

const props = withDefaults(
  defineProps<{
    appearance: Appearance;
    size?: number;
  }>(),
  { size: 36 },
);

// Vertical window into the 32px frame: from the hair (y≈8) down to the torso
// (y≈28) — full head + body as a bust, sitting a touch high in the circle.
const TOP_FRAME = 8;
const BOTTOM_FRAME = 28;

const scale = computed(() => props.size / (BOTTOM_FRAME - TOP_FRAME));
const left = computed(() => (props.size - CG_FRAME_W * scale.value) / 2);
const top = computed(() => -TOP_FRAME * scale.value);

const containerStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}));
</script>

<template>
  <div class="char-avatar" :style="containerStyle">
    <div class="char-avatar__inner" :style="{ left: `${left}px`, top: `${top}px` }">
      <UserCharacterPreview :appearance="appearance" :frame="3" :scale="scale" />
    </div>
  </div>
</template>

<style scoped>
.char-avatar {
  position: relative;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, var(--accent-warm), var(--accent-rose));
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.12);
}
.char-avatar__inner {
  position: absolute;
}
</style>

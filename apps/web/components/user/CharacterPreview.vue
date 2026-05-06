<script setup lang="ts">
import {
  CG_LAYER_ORDER,
  type Appearance,
  type CgLayer,
  variantUrl,
} from '~/composables/useCharacter';

const props = withDefaults(
  defineProps<{
    appearance: Appearance;
    /** Frame index on row 0 (idle): 0=right 1=up 2=left 3=down. */
    frame?: number;
    /** Visual scale applied to the 16×32 sprite frame. */
    scale?: number;
  }>(),
  { frame: 3, scale: 4 },
);

const FRAME_W = 16;
const FRAME_H = 32;

const offsetX = computed(() => -(props.frame % 56) * FRAME_W);
const offsetY = computed(() => -Math.floor(props.frame / 56) * FRAME_H);

const layers = computed(() =>
  CG_LAYER_ORDER.map((layer: CgLayer) => {
    const variant = props.appearance[layer];
    return variant ? { layer, url: variantUrl(layer, variant) } : null;
  }).filter((x): x is { layer: CgLayer; url: string } => x !== null),
);

const wrapperStyle = computed(() => ({
  width: `${FRAME_W * props.scale}px`,
  height: `${FRAME_H * props.scale}px`,
}));

const layerStyle = computed(() => ({
  width: `${FRAME_W}px`,
  height: `${FRAME_H}px`,
  transform: `scale(${props.scale})`,
  transformOrigin: 'top left',
  imageRendering: 'pixelated' as const,
  backgroundPosition: `${offsetX.value}px ${offsetY.value}px`,
  backgroundRepeat: 'no-repeat',
}));
</script>

<template>
  <div class="relative" :style="wrapperStyle">
    <div
      v-for="(l, i) in layers"
      :key="l.layer"
      class="absolute top-0 left-0"
      :style="{ ...layerStyle, backgroundImage: `url(${l.url})`, zIndex: i }"
    />
  </div>
</template>

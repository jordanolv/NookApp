<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';

type AttachableTrack = {
  attach: (el: HTMLVideoElement) => HTMLVideoElement;

  detach: (el: HTMLVideoElement) => HTMLVideoElement;
};

const props = defineProps<{
  track: AttachableTrack;
  mirror: boolean;
  speaking: boolean;
  x: number;
  y: number;
}>();

const emit = defineEmits<{ click: [] }>();

const videoRef = ref<HTMLVideoElement | null>(null);
let attachedTrack: AttachableTrack | null = null;

function attach(track: AttachableTrack) {
  if (!videoRef.value) return;
  if (attachedTrack === track) return;
  if (attachedTrack) attachedTrack.detach(videoRef.value);
  track.attach(videoRef.value);
  attachedTrack = track;
}

watch(
  () => props.track,
  (next) => attach(next),
  { immediate: false },
);

onBeforeUnmount(() => {
  if (attachedTrack && videoRef.value) attachedTrack.detach(videoRef.value);
  attachedTrack = null;
});
</script>

<template>
  <video
    ref="videoRef"
    autoplay
    playsinline
    muted
    class="absolute z-10 cursor-pointer"
    :style="{
      left: x - 36 + 'px',
      top: y - 72 - 11 + 'px',
      width: '72px',
      height: '72px',
      borderRadius: '50%',
      objectFit: 'cover',
      background: '#1d1b26',
      transform: mirror ? 'scaleX(-1)' : undefined,
      border: speaking ? '3px solid #2bd47b' : '3px solid rgba(255,255,255,0.2)',
      boxShadow: speaking
        ? '0 6px 16px rgba(0,0,0,0.55),0 0 18px rgba(43,212,123,0.45)'
        : '0 4px 12px rgba(0,0,0,0.4)',
    }"
    @click="emit('click')"
    @vue:mounted="attach(props.track)"
  />
</template>

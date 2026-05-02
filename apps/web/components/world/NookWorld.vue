<script setup lang="ts">
import Phaser from 'phaser';
import { NookScene } from './NookScene';

const props = defineProps<{ playerName: string }>();

const canvasRef = ref<HTMLDivElement | null>(null);
const nameTagRef = ref<HTMLDivElement | null>(null);
const game = ref<Phaser.Game | null>(null);

onMounted(() => {
  if (!canvasRef.value) return;

  const scene = new NookScene();

  game.value = new Phaser.Game({
    type: Phaser.AUTO,
    parent: canvasRef.value,
    width: canvasRef.value.clientWidth,
    height: canvasRef.value.clientHeight,
    backgroundColor: '#cdd0d4',
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 0 }, debug: false },
    },
    scene,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      pixelArt: true,
      antialias: false,
    },
    input: {
      keyboard: true,
    },
  });

  // Focus the canvas so keyboard input is captured without needing a click
  nextTick(() => {
    const canvas = canvasRef.value?.querySelector('canvas');
    if (canvas) {
      canvas.setAttribute('tabindex', '0');
      canvas.focus();
    }
  });

  scene.events.once(Phaser.Scenes.Events.CREATE, () => {
    scene.events.on('player-pos', ({ worldX, worldY }: { worldX: number; worldY: number }) => {
      if (!nameTagRef.value || !canvasRef.value) return;
      const cam = scene.cameras.main;
      const rect = canvasRef.value.getBoundingClientRect();
      const { x, y } = NookScene.projectToScreen(cam, rect, worldX, worldY);
      nameTagRef.value.style.left = `${x}px`;
      nameTagRef.value.style.top = `${y - 52}px`;
    });
  });
});

onUnmounted(() => {
  game.value?.destroy(true);
  game.value = null;
});
</script>

<template>
  <div class="relative w-full h-full overflow-hidden">
    <div ref="canvasRef" class="absolute inset-0" />
    <div
      ref="nameTagRef"
      class="pointer-events-none fixed z-10 -translate-x-1/2 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white whitespace-nowrap"
    >
      {{ props.playerName }}
    </div>
  </div>
</template>

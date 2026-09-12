<script setup lang="ts">
const props = defineProps<{ deviceId: string | null }>();

const level = ref(0);
const error = ref(false);
let stream: MediaStream | null = null;
let ctx: AudioContext | null = null;
let raf = 0;

function stop() {
  cancelAnimationFrame(raf);
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  void ctx?.close();
  ctx = null;
  level.value = 0;
}

async function start() {
  stop();
  error.value = false;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: props.deviceId ? { deviceId: { exact: props.deviceId } } : true,
    });
  } catch {
    error.value = true;
    return;
  }
  ctx = new AudioContext();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  ctx.createMediaStreamSource(stream).connect(analyser);
  const buf = new Uint8Array(analyser.fftSize);
  const tick = () => {
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += (v - 128) ** 2;
    // RMS scaled so normal speech lands around 60-80%.
    level.value = Math.min(1, Math.sqrt(sum / buf.length) / 40);
    raf = requestAnimationFrame(tick);
  };
  tick();
}

watch(() => props.deviceId, start);
onMounted(start);
onBeforeUnmount(stop);
</script>

<template>
  <div class="mic-meter" :class="{ 'mic-meter--error': error }">
    <div class="mic-meter__fill" :style="{ width: `${Math.round(level * 100)}%` }" />
  </div>
</template>

<style scoped>
.mic-meter {
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--surface-tinted-strong);
  border: 1px solid var(--surface-border);
}
.mic-meter__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #4ade80 0%, #facc15 70%, #f87171 100%);
  transition: width 60ms linear;
}
.mic-meter--error {
  border-color: #f87171;
}
</style>

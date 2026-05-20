import { onUnmounted, ref } from 'vue';

export function useQueueTimer() {
  const active = ref(false);
  const elapsed = ref(0);
  let timer: ReturnType<typeof setInterval> | null = null;

  function toggle() {
    active.value = !active.value;
    if (active.value) {
      elapsed.value = 0;
      timer = setInterval(() => elapsed.value++, 1000);
    } else if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function format(s: number) {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  }

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  return { active, elapsed, toggle, format };
}

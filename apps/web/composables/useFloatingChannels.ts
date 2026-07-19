import { ref } from 'vue';

export interface FloatingChannel {
  channelId: string;
  channelName: string;
  widgetKind?: string | null;
  x: number;
  y: number;
}

interface Options {
  width?: number;
  height?: number;
  stagger?: number;
}

/**
 * Stack of floating windows positioned relative to viewport center, with
 * stagger so consecutive opens don't overlap exactly.
 */
export function useFloatingChannels(opts: Options = {}) {
  const width = opts.width ?? 720;
  const height = opts.height ?? 560;
  const stagger = opts.stagger ?? 28;

  const windows = ref<FloatingChannel[]>([]);
  let counter = 0;

  function focus(channelId: string) {
    const win = windows.value.find((w) => w.channelId === channelId);
    if (!win) return;
    windows.value = [...windows.value.filter((w) => w.channelId !== channelId), win];
  }

  function open(channel: { id: string; name: string; widgetKind?: string | null }) {
    if (windows.value.some((w) => w.channelId === channel.id)) {
      focus(channel.id);
      return;
    }
    const offset = (counter % 6) * stagger;
    const x = import.meta.client ? Math.round(window.innerWidth / 2 - width / 2) + offset : 200;
    const y = import.meta.client ? Math.round(window.innerHeight / 2 - height / 2) + offset : 100;
    counter++;
    windows.value = [
      ...windows.value,
      { channelId: channel.id, channelName: channel.name, widgetKind: channel.widgetKind, x, y },
    ];
  }

  function close(channelId: string) {
    windows.value = windows.value.filter((w) => w.channelId !== channelId);
  }

  function updatePosition(channelId: string, x: number, y: number) {
    windows.value = windows.value.map((w) => (w.channelId === channelId ? { ...w, x, y } : w));
  }

  return { windows, open, close, focus, updatePosition };
}

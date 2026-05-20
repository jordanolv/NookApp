import { ref } from 'vue';

export interface OpenedTopic {
  channelId: string;
  channelName: string;
  x: number;
  y: number;
}

export function useGameTopicWindows() {
  const openTopics = ref<OpenedTopic[]>([]);
  let counter = 0;

  function open(channelId: string, channelName: string) {
    const existing = openTopics.value.find((t) => t.channelId === channelId);
    if (existing) {
      focus(channelId);
      return;
    }
    const stagger = (counter % 6) * 28;
    const x = import.meta.client ? Math.round(window.innerWidth / 2 - 380) + stagger : 200;
    const y = import.meta.client ? Math.round(window.innerHeight / 2 - 300) + stagger : 100;
    counter++;
    openTopics.value = [...openTopics.value, { channelId, channelName, x, y }];
  }

  function close(channelId: string) {
    openTopics.value = openTopics.value.filter((t) => t.channelId !== channelId);
  }

  function focus(channelId: string) {
    const t = openTopics.value.find((x) => x.channelId === channelId);
    if (!t) return;
    openTopics.value = [...openTopics.value.filter((x) => x.channelId !== channelId), t];
  }

  function updatePosition(channelId: string, x: number, y: number) {
    const t = openTopics.value.find((t) => t.channelId === channelId);
    if (t) {
      t.x = x;
      t.y = y;
    }
  }

  return { openTopics, open, close, focus, updatePosition };
}

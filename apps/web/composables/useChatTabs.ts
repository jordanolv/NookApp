import { computed, ref } from 'vue';

export interface FloatingChat {
  channelId: string;
  x: number;
  y: number;
}

export function useChatTabs() {
  const tabIds = ref<string[]>([]);
  const activeId = ref<string | null>(null);
  const floating = ref<FloatingChat[]>([]);
  const draggingId = ref<string | null>(null);

  function focusFloating(channelId: string) {
    const win = floating.value.find((w) => w.channelId === channelId);
    if (!win) return;
    floating.value = [...floating.value.filter((w) => w.channelId !== channelId), win];
  }

  function openChannel(channelId: string) {
    if (floating.value.some((w) => w.channelId === channelId)) {
      focusFloating(channelId);
      return;
    }
    if (!tabIds.value.includes(channelId)) {
      tabIds.value = [...tabIds.value, channelId];
    }
    activeId.value = channelId;
  }

  function closeAllTabs() {
    tabIds.value = [];
    activeId.value = null;
  }

  function closeTab(channelId: string) {
    const idx = tabIds.value.indexOf(channelId);
    tabIds.value = tabIds.value.filter((id) => id !== channelId);
    if (activeId.value === channelId) {
      activeId.value = tabIds.value[Math.max(0, idx - 1)] ?? null;
    }
  }

  function closeFloating(channelId: string) {
    floating.value = floating.value.filter((w) => w.channelId !== channelId);
  }

  function tearOff(channelId: string, x: number, y: number) {
    closeTab(channelId);
    floating.value = [...floating.value, { channelId, x, y }];
  }

  function dockToTabBar(channelId: string) {
    draggingId.value = null;
    closeFloating(channelId);
    if (!tabIds.value.includes(channelId)) {
      tabIds.value = [...tabIds.value, channelId];
    }
    activeId.value = channelId;
  }

  const activeChannelIds = computed(
    () => new Set([...tabIds.value, ...floating.value.map((w) => w.channelId)]),
  );

  return {
    tabIds,
    activeId,
    floating,
    draggingId,
    activeChannelIds,
    openChannel,
    closeAllTabs,
    closeTab,
    closeFloating,
    focusFloating,
    tearOff,
    dockToTabBar,
  };
}

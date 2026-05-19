<script setup lang="ts">
const props = defineProps<{
  channelIds: string[];
  activeId: string | null;
  draggingChannelId?: string | null;
}>();

const emit = defineEmits<{
  close: [];
  'close-tab': [channelId: string];
  'set-active': [channelId: string];
  'tear-off': [channelId: string, x: number, y: number];
  dock: [channelId: string];
}>();

function onContainerMouseup() {
  if (props.draggingChannelId) emit('dock', props.draggingChannelId);
}

const { store } = useServers();

function channelName(id: string) {
  return store.channels.find((c) => c.id === id)?.name ?? '…';
}

const { apiBase } = useRuntimeConfig().public;
const apiOrigin = new URL(apiBase as string).origin;
function resolveUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.startsWith('/') ? `${apiOrigin}${url}` : url;
}

const activeBannerUrl = computed(() => {
  if (!props.activeId) return null;
  return resolveUrl(store.channels.find((c) => c.id === props.activeId)?.bannerUrl);
});

const titleText = computed(() => {
  const count = props.channelIds.length;
  if (count === 0) return 'Chats';
  if (count === 1) return `# ${channelName(props.channelIds[0]!)}`;
  return `Chats — ${count} onglets`;
});

const _tearDrag = ref<{
  channelId: string;
  startX: number;
  startY: number;
  ghostX: number;
  ghostY: number;
  tearing: boolean;
} | null>(null);

function onTabMousedown(channelId: string, e: MouseEvent) {
  _tearDrag.value = {
    channelId,
    startX: e.clientX,
    startY: e.clientY,
    ghostX: e.clientX,
    ghostY: e.clientY,
    tearing: false,
  };
  e.preventDefault();
  e.stopPropagation();
}

function onGlobalMousemove(e: MouseEvent) {
  if (!_tearDrag.value) return;
  _tearDrag.value.ghostX = e.clientX;
  _tearDrag.value.ghostY = e.clientY;
  const dx = e.clientX - _tearDrag.value.startX;
  const dy = e.clientY - _tearDrag.value.startY;
  if (!_tearDrag.value.tearing && (Math.abs(dx) > 20 || Math.abs(dy) > 30)) {
    _tearDrag.value.tearing = true;
  }
}

function onGlobalMouseup(e: MouseEvent) {
  if (!_tearDrag.value) return;
  if (_tearDrag.value.tearing) {
    emit('tear-off', _tearDrag.value.channelId, e.clientX - 200, e.clientY - 20);
  } else {
    emit('set-active', _tearDrag.value.channelId);
  }
  _tearDrag.value = null;
}

onMounted(() => {
  window.addEventListener('mousemove', onGlobalMousemove);
  window.addEventListener('mouseup', onGlobalMouseup);
});
onUnmounted(() => {
  window.removeEventListener('mousemove', onGlobalMousemove);
  window.removeEventListener('mouseup', onGlobalMouseup);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="_tearDrag?.tearing"
      class="fixed z-[200] pointer-events-none flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium select-none"
      :style="{
        left: _tearDrag.ghostX - 40 + 'px',
        top: _tearDrag.ghostY - 14 + 'px',
        background: 'rgba(10, 10, 16, 0.92)',
        border: '1px solid rgba(99, 102, 241, 0.6)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        color: 'rgba(255,255,255,0.75)',
      }"
    >
      # {{ channelName(_tearDrag.channelId) }}
    </div>
  </Teleport>

  <UiFloatingWindow
    :title="titleText"
    :banner-url="activeBannerUrl"
    :initial-x="80"
    :initial-y="80"
    :initial-width="480"
    :initial-height="540"
    :min-width="320"
    :min-height="300"
    :z-index="30"
    :close-on-escape="false"
    persist-key="chat:tabs"
    @close="emit('close')"
  >
    <div class="relative h-full flex flex-col" @mouseup="onContainerMouseup">
      <Transition name="dock-hint">
        <div
          v-if="draggingChannelId"
          class="absolute inset-0 pointer-events-none z-[60]"
          style="border: 1.5px dashed rgba(99, 102, 241, 0.7); background: rgba(99, 102, 241, 0.06)"
        >
          <div
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-medium px-3 py-1.5 rounded-xl"
            style="
              background: rgba(99, 102, 241, 0.25);
              color: rgba(165, 180, 252, 0.9);
              border: 1px solid rgba(99, 102, 241, 0.4);
            "
          >
            Déposer pour ajouter l'onglet
          </div>
        </div>
      </Transition>

      <div
        class="flex flex-shrink-0 items-stretch gap-0 pr-2 select-none"
        style="border-bottom: 1px solid rgba(255, 255, 255, 0.07); min-height: 32px"
      >
        <div
          v-for="channelId in channelIds"
          :key="channelId"
          class="relative flex items-center gap-1.5 px-2.5 text-xs font-medium select-none cursor-pointer"
          :style="
            channelId === activeId
              ? 'background: rgba(255,255,255,0.09); color: rgba(255,255,255,0.85); margin-bottom: -1px; padding-bottom: 1px; position: relative; z-index: 1'
              : 'color: rgba(255,255,255,0.35); padding-top: 4px; padding-bottom: 4px; border-radius: 8px 8px 0 0; margin-top: 4px'
          "
          @mousedown="onTabMousedown(channelId, $event)"
        >
          <span
            v-if="_tearDrag?.channelId === channelId && _tearDrag.tearing"
            class="absolute inset-0 rounded-t-lg"
            style="background: rgba(99, 102, 241, 0.2); border: 1px dashed rgba(99, 102, 241, 0.4)"
          />
          <span class="truncate max-w-[110px]"># {{ channelName(channelId) }}</span>
          <button
            class="flex-shrink-0 ml-0.5 h-3.5 w-3.5 rounded-full flex items-center justify-center transition-opacity opacity-40 hover:opacity-100"
            style="color: rgba(255, 255, 255, 0.7)"
            @mousedown.stop
            @click.stop="emit('close-tab', channelId)"
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </div>
      </div>

      <ChatPane v-if="activeId" :key="activeId" :channel-id="activeId" />
      <div
        v-else
        class="flex-1 flex items-center justify-center text-xs"
        style="color: rgba(255, 255, 255, 0.2)"
      >
        Aucun canal ouvert
      </div>
    </div>
  </UiFloatingWindow>
</template>

<style scoped>
.dock-hint-enter-active,
.dock-hint-leave-active {
  transition: opacity 0.15s ease;
}
.dock-hint-enter-from,
.dock-hint-leave-to {
  opacity: 0;
}
</style>

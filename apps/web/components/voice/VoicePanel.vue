<script setup lang="ts">
import { useDraggable } from '@vueuse/core';

const {
  currentChannelId,
  isMuted,
  isDeafened,
  voicePresence,
  activeSpeakers,
  leave,
  toggleMute,
  toggleDeafen,
} = useVoice();
const { store } = useServers();
const { user } = useAuth();

const panel = ref<HTMLElement | null>(null);
const handle = ref<HTMLElement | null>(null);

const { style: dragStyle } = useDraggable(panel, {
  handle,
  initialValue: { x: 16, y: window.innerHeight - 200 },
  preventDefault: true,
});

// Resize state
const width = ref(240);
const isResizing = ref(false);
let resizeStartX = 0;
let resizeStartW = 0;

function onResizeStart(e: MouseEvent) {
  isResizing.value = true;
  resizeStartX = e.clientX;
  resizeStartW = width.value;
  e.preventDefault();
  e.stopPropagation();
}

function onResizeMove(e: MouseEvent) {
  if (!isResizing.value) return;
  const delta = e.clientX - resizeStartX;
  width.value = Math.max(200, Math.min(420, resizeStartW + delta));
}

function onResizeEnd() {
  isResizing.value = false;
}

onMounted(() => {
  window.addEventListener('mousemove', onResizeMove);
  window.addEventListener('mouseup', onResizeEnd);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', onResizeMove);
  window.removeEventListener('mouseup', onResizeEnd);
});

const route = useRoute();

const currentChannel = computed(
  () => store.voiceChannels.find((ch) => ch.id === currentChannelId.value) ?? null,
);

const currentTextChannel = computed(() => {
  const match = route.path.match(/\/channels\/([^/]+)/);
  const id = match?.[1];
  return id ? (store.channels.find((ch) => ch.id === id) ?? null) : null;
});

const participants = computed(() =>
  currentChannelId.value ? (voicePresence.value.get(currentChannelId.value) ?? []) : [],
);
</script>

<template>
  <div
    ref="panel"
    :style="[dragStyle, { width: width + 'px' }]"
    class="fixed z-50 flex flex-col select-none"
  >
    <!-- Card -->
    <div
      class="relative rounded-2xl overflow-hidden"
      style="
        background: rgba(15, 15, 20, 0.72);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.5),
          inset 0 1px 0 rgba(255, 255, 255, 0.06);
      "
    >
      <!-- Voice section -->
      <Transition name="voice-section">
        <div v-if="currentChannelId">
          <div class="flex items-center gap-2 px-3 pt-3 pb-2">
            <span class="text-green-400 flex-shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"
                />
              </svg>
            </span>
            <div class="flex-1 min-w-0">
              <p class="truncate text-xs font-semibold text-green-400 leading-tight">
                {{ currentChannel?.name ?? '...' }}
              </p>
              <p class="text-xs leading-tight" style="color: rgba(255, 255, 255, 0.35)">
                Voice connected
              </p>
            </div>
            <button
              class="flex-shrink-0 rounded-lg p-1 transition-colors"
              style="color: rgba(255, 255, 255, 0.3)"
              title="Leave voice"
              @mouseenter="($event.currentTarget as HTMLElement).style.color = 'rgb(248,113,113)'"
              @mouseleave="
                ($event.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'
              "
              @click="leave"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"
                />
              </svg>
            </button>
          </div>

          <ul v-if="participants.length" class="flex flex-col gap-0.5 px-2 pb-2">
            <li
              v-for="p in participants"
              :key="p.userId"
              class="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors"
              :style="activeSpeakers.has(p.userId) ? 'background:rgba(74,222,128,0.08)' : ''"
            >
              <div class="relative flex-shrink-0">
                <div
                  class="h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold"
                  style="background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.7)"
                >
                  {{ p.name[0]?.toUpperCase() }}
                </div>
                <span
                  v-if="activeSpeakers.has(p.userId)"
                  class="absolute inset-0 rounded-full ring-2 ring-green-400"
                />
              </div>
              <span class="truncate text-xs font-medium" style="color: rgba(255, 255, 255, 0.75)">{{
                p.name
              }}</span>
            </li>
          </ul>

          <div style="height: 1px; margin: 0 12px; background: rgba(255, 255, 255, 0.06)" />
        </div>
      </Transition>

      <!-- User bar + drag handle -->
      <div
        ref="handle"
        class="flex items-center gap-2.5 px-2.5 py-2.5 cursor-grab active:cursor-grabbing"
      >
        <!-- Avatar -->
        <div class="relative flex-shrink-0">
          <div
            class="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style="background: linear-gradient(135deg, #6366f1, #4f46e5)"
          >
            {{ user?.name?.[0]?.toUpperCase() }}
          </div>
          <span
            class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
            style="border: 2px solid rgba(15, 15, 20, 0.9)"
            :style="{ background: currentChannelId ? '#22c55e' : 'rgba(255,255,255,0.2)' }"
          />
        </div>

        <!-- Name + status -->
        <div class="flex-1 min-w-0">
          <p
            class="truncate text-xs font-semibold leading-tight"
            style="color: rgba(255, 255, 255, 0.9)"
          >
            {{ user?.name }}
          </p>
          <p
            class="text-xs leading-tight"
            :style="currentChannelId ? 'color:#4ade80' : 'color:rgba(255,255,255,0.35)'"
          >
            {{
              currentChannelId
                ? currentChannel?.name
                : currentTextChannel
                  ? '#' + currentTextChannel.name
                  : 'In Nook'
            }}
          </p>
        </div>

        <!-- Controls -->
        <div class="flex items-center gap-0.5" @mousedown.stop>
          <button
            class="rounded-xl p-1.5 transition-all duration-150"
            :style="
              isMuted
                ? 'color:rgb(248,113,113);background:rgba(239,68,68,0.15)'
                : 'color:rgba(255,255,255,0.4)'
            "
            :title="isMuted ? 'Unmute' : 'Mute'"
            @click="toggleMute"
          >
            <svg v-if="!isMuted" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
              />
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"
              />
            </svg>
          </button>

          <button
            class="rounded-xl p-1.5 transition-all duration-150"
            :style="
              isDeafened
                ? 'color:rgb(248,113,113);background:rgba(239,68,68,0.15)'
                : 'color:rgba(255,255,255,0.4)'
            "
            :title="isDeafened ? 'Undeafen' : 'Deafen'"
            @click="toggleDeafen"
          >
            <svg v-if="!isDeafened" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"
              />
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9zM1 12l2 2 2-2-2-2-2 2zm18 0l2 2 2-2-2-2-2 2z"
              />
            </svg>
          </button>

          <button
            class="rounded-xl p-1.5 transition-all duration-150"
            style="color: rgba(255, 255, 255, 0.4)"
            title="Settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- Resize handle (right edge) -->
      <div
        class="absolute top-0 right-0 w-1.5 h-full cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity rounded-r-2xl"
        style="background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.15))"
        @mousedown="onResizeStart"
      />
    </div>
  </div>
</template>

<style scoped>
.voice-section-enter-active,
.voice-section-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}
.voice-section-enter-from,
.voice-section-leave-to {
  opacity: 0;
  max-height: 0;
}
.voice-section-enter-to,
.voice-section-leave-from {
  opacity: 1;
  max-height: 300px;
}
</style>

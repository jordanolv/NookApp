<script setup lang="ts">
const {
  currentChannelId,
  isMuted,
  isDeafened,
  isCameraOn,
  isScreenSharing,
  leave,
  toggleMute,
  toggleDeafen,
  toggleCamera,
  toggleScreenShare,
} = useVoice();
const { store } = useServers();
const { user } = useAuth();

const panel = ref<HTMLElement | null>(null);
const panelX = ref(16);
const panelBottom = ref(16);

const panelStyle = computed(() => ({
  position: 'fixed' as const,
  left: `${panelX.value}px`,
  bottom: `${panelBottom.value}px`,
}));

let isDragging = false;
let startMouseX = 0;
let startMouseY = 0;
let startPanelX = 0;
let startPanelBottom = 0;

function onHandleMousedown(e: MouseEvent) {
  isDragging = true;
  startMouseX = e.clientX;
  startMouseY = e.clientY;
  startPanelX = panelX.value;
  startPanelBottom = panelBottom.value;
  e.preventDefault();
}

function onMousemove(e: MouseEvent) {
  if (!isDragging || !panel.value) return;
  const rect = panel.value.getBoundingClientRect();
  panelX.value = Math.max(
    4,
    Math.min(startPanelX + (e.clientX - startMouseX), window.innerWidth - rect.width - 4),
  );
  panelBottom.value = Math.max(
    4,
    Math.min(startPanelBottom - (e.clientY - startMouseY), window.innerHeight - rect.height - 4),
  );
}

function onMouseup() {
  isDragging = false;
}

onMounted(() => {
  window.addEventListener('mousemove', onMousemove);
  window.addEventListener('mouseup', onMouseup);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', onMousemove);
  window.removeEventListener('mouseup', onMouseup);
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
</script>

<template>
  <div ref="panel" :style="panelStyle" class="z-50 w-60 select-none">
    <div
      class="relative rounded-2xl overflow-hidden"
      style="
        background: rgba(15, 15, 20, 0.78);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.5),
          inset 0 1px 0 rgba(255, 255, 255, 0.06);
      "
    >
      <!-- Voice section — only when connected -->
      <Transition name="voice-section">
        <div v-if="currentChannelId">
          <!-- Status header -->
          <div class="flex items-center gap-2 px-3 pt-3 pb-2">
            <span class="text-green-400 flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"
                />
              </svg>
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold leading-tight text-green-400">Voice Connected</p>
              <p class="truncate text-xs leading-tight" style="color: rgba(255, 255, 255, 0.35)">
                {{ store.current?.name }} / {{ currentChannel?.name }}
              </p>
            </div>
            <button
              class="flex-shrink-0 rounded-lg p-1.5 transition-colors"
              style="color: rgba(255, 255, 255, 0.3)"
              title="Leave voice"
              @mouseenter="($event.currentTarget as HTMLElement).style.color = 'rgb(248,113,113)'"
              @mouseleave="
                ($event.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)'
              "
              @click="leave"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
                />
              </svg>
            </button>
          </div>

          <!-- Action buttons grid -->
          <div class="grid grid-cols-4 gap-1.5 px-2.5 pb-2.5">
            <button
              class="flex flex-col items-center gap-1 rounded-xl py-2 transition-all duration-150"
              :style="
                isMuted
                  ? 'background:rgba(239,68,68,0.18);color:rgb(248,113,113)'
                  : 'background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.5)'
              "
              :title="isMuted ? 'Unmute' : 'Mute'"
              @click="toggleMute"
            >
              <svg v-if="!isMuted" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
                />
              </svg>
              <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"
                />
              </svg>
              <span class="text-[9px] leading-none font-medium">{{
                isMuted ? 'Muet' : 'Micro'
              }}</span>
            </button>

            <button
              class="flex flex-col items-center gap-1 rounded-xl py-2 transition-all duration-150"
              :style="
                isDeafened
                  ? 'background:rgba(239,68,68,0.18);color:rgb(248,113,113)'
                  : 'background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.5)'
              "
              :title="isDeafened ? 'Undeafen' : 'Deafen'"
              @click="toggleDeafen"
            >
              <svg
                v-if="!isDeafened"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"
                />
              </svg>
              <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9zM1 12l2 2 2-2-2-2-2 2zm18 0l2 2 2-2-2-2-2 2z"
                />
              </svg>
              <span class="text-[9px] leading-none font-medium">{{
                isDeafened ? 'Sourd' : 'Son'
              }}</span>
            </button>

            <button
              class="flex flex-col items-center gap-1 rounded-xl py-2 transition-all duration-150"
              :style="
                isCameraOn
                  ? 'background:rgba(99,102,241,0.18);color:rgb(129,140,248)'
                  : 'background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.5)'
              "
              :title="isCameraOn ? 'Désactiver caméra' : 'Activer caméra'"
              @click="toggleCamera"
            >
              <svg
                v-if="!isCameraOn"
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"
                />
              </svg>
              <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M21 6.5l-4-4-9.65 9.65-1.85-1.85L3.5 12.3l2.5 2.5-2 2H2v2h2l2-2 2.5 2.5 2-2-1.85-1.85L21 6.5zM5 18V8.5l2 2V16l6-6 2 2-6 6h5.5l2 2H5z"
                />
              </svg>
              <span class="text-[9px] leading-none font-medium">Caméra</span>
            </button>

            <button
              class="flex flex-col items-center gap-1 rounded-xl py-2 transition-all duration-150"
              :style="
                isScreenSharing
                  ? 'background:rgba(99,102,241,0.18);color:rgb(129,140,248)'
                  : 'background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.5)'
              "
              :title="isScreenSharing ? 'Arrêter le partage' : 'Partager l\'écran'"
              @click="toggleScreenShare"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"
                />
              </svg>
              <span class="text-[9px] leading-none font-medium">{{
                isScreenSharing ? 'Partage' : 'Écran'
              }}</span>
            </button>
          </div>

          <!-- Participants -->
          <div style="height: 1px; margin: 0 12px; background: rgba(255, 255, 255, 0.06)" />
        </div>
      </Transition>

      <!-- User bar — always visible, drag handle -->
      <div
        class="flex items-center gap-2.5 px-2.5 py-2.5 cursor-grab active:cursor-grabbing"
        @mousedown="onHandleMousedown"
      >
        <!-- Avatar + status dot -->
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

        <!-- Name + status text -->
        <div class="flex-1 min-w-0">
          <p
            class="truncate text-xs font-semibold leading-tight"
            style="color: rgba(255, 255, 255, 0.9)"
          >
            {{ user?.name }}
          </p>
          <p
            class="truncate text-xs leading-tight"
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

        <!-- Quick controls -->
        <div class="flex items-center gap-0.5 flex-shrink-0" @mousedown.stop>
          <button
            class="rounded-xl p-1.5 transition-all duration-150"
            :style="
              isMuted
                ? 'color:rgb(248,113,113);background:rgba(239,68,68,0.15)'
                : 'color:rgba(255,255,255,0.35)'
            "
            :title="isMuted ? 'Unmute' : 'Mute'"
            @click="toggleMute"
          >
            <svg v-if="!isMuted" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
              />
            </svg>
            <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
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
                : 'color:rgba(255,255,255,0.35)'
            "
            :title="isDeafened ? 'Undeafen' : 'Deafen'"
            @click="toggleDeafen"
          >
            <svg v-if="!isDeafened" width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"
              />
            </svg>
            <svg v-else width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9zM1 12l2 2 2-2-2-2-2 2zm18 0l2 2 2-2-2-2-2 2z"
              />
            </svg>
          </button>

          <button
            class="rounded-xl p-1.5 transition-all duration-150"
            style="color: rgba(255, 255, 255, 0.35)"
            title="Settings"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
              />
            </svg>
          </button>
        </div>
      </div>
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
  max-height: 400px;
}
</style>

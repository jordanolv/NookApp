<script setup lang="ts">
import { type LocalVideoTrack, type RemoteVideoTrack } from 'livekit-client';

type VideoTrack = LocalVideoTrack | RemoteVideoTrack;
type Feed = {
  key: string;
  name: string;
  track: VideoTrack;
  type: 'cam' | 'screen';
  mirror: boolean;
};

const voice = useVoice();

const participants = computed(() =>
  voice.currentChannelId.value
    ? (voice.voicePresence.value.get(voice.currentChannelId.value) ?? [])
    : [],
);

const allFeeds = computed((): Feed[] => {
  const feeds: Feed[] = [];

  if (voice.isCameraOn.value && voice.localCameraTrack.value) {
    feeds.push({
      key: 'local-cam',
      name: 'Vous',
      track: voice.localCameraTrack.value as VideoTrack,
      type: 'cam',
      mirror: true,
    });
  }

  for (const p of participants.value) {
    if (voice.participantMedia.value.get(p.userId)?.cam) {
      const track = voice.remoteVideoTracks.value.get(p.userId) as RemoteVideoTrack | undefined;
      if (track)
        feeds.push({ key: `cam-${p.userId}`, name: p.name, track, type: 'cam', mirror: false });
    }
    if (voice.participantMedia.value.get(p.userId)?.screen) {
      const track = voice.remoteScreenTracks.value.get(p.userId) as RemoteVideoTrack | undefined;
      if (track)
        feeds.push({
          key: `screen-${p.userId}`,
          name: p.name,
          track,
          type: 'screen',
          mirror: false,
        });
    }
  }

  return feeds;
});

const isVisible = computed(
  () => allFeeds.value.length > 0 && voice.mediaViewMode.value === 'panel',
);

// ─── Focus state ─────────────────────────────────────────────────────

const focusedKey = ref<string | null>(null);

const focusedFeed = computed(
  () => allFeeds.value.find((f) => f.key === focusedKey.value) ?? allFeeds.value[0] ?? null,
);

const thumbnails = computed(() => allFeeds.value.filter((f) => f.key !== focusedFeed.value?.key));

// Sync focus when NookWorld signals which bubble was clicked
watch(
  () => voice.mediaPanelFocusKey.value,
  (key) => {
    if (key) focusedKey.value = key;
  },
);

watch(allFeeds, (feeds) => {
  if (!feeds.find((f) => f.key === focusedKey.value)) {
    focusedKey.value = feeds[0]?.key ?? null;
  }
});

// ─── Drag ────────────────────────────────────────────────────────────

const pos = ref({ x: 16, y: 0 });
const panelW = ref(300);

onMounted(() => {
  pos.value = { x: 16, y: Math.max(16, window.innerHeight - 460) };
});

let dragOffset = { x: 0, y: 0 };

function onDragStart(e: MouseEvent) {
  dragOffset = { x: e.clientX - pos.value.x, y: e.clientY - pos.value.y };
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd, { once: true });
}

function onDragMove(e: MouseEvent) {
  pos.value = {
    x: Math.max(0, Math.min(window.innerWidth - panelW.value, e.clientX - dragOffset.x)),
    y: Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.y)),
  };
}

function onDragEnd() {
  window.removeEventListener('mousemove', onDragMove);
}

// ─── Resize ──────────────────────────────────────────────────────────

let resizeStartX = 0;
let resizeStartW = 0;

function onResizeStart(e: MouseEvent) {
  e.stopPropagation();
  resizeStartX = e.clientX;
  resizeStartW = panelW.value;
  window.addEventListener('mousemove', onResizeMove);
  window.addEventListener('mouseup', onResizeEnd, { once: true });
}

function onResizeMove(e: MouseEvent) {
  panelW.value = Math.max(200, Math.min(720, resizeStartW + e.clientX - resizeStartX));
}

function onResizeEnd() {
  window.removeEventListener('mousemove', onResizeMove);
}

// ─── Video track attachment ───────────────────────────────────────────

const attachedTracks = new Map<string, { el: HTMLVideoElement; track: VideoTrack }>();

function setVideoRef(key: string, el: unknown, track: VideoTrack | null) {
  const existing = attachedTracks.get(key);
  if (existing && existing.el !== el) {
    existing.track.detach(existing.el);
    attachedTracks.delete(key);
  }
  if (el instanceof HTMLVideoElement && track) {
    track.attach(el);
    attachedTracks.set(key, { el, track });
  }
}

onBeforeUnmount(() => {
  for (const { el, track } of attachedTracks.values()) track.detach(el);
  attachedTracks.clear();
  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mousemove', onResizeMove);
});
</script>

<template>
  <Transition name="media-panel">
    <div
      v-if="isVisible"
      class="fixed z-40 select-none"
      :style="{ left: pos.x + 'px', top: pos.y + 'px', width: panelW + 'px' }"
    >
      <div
        class="relative rounded-2xl overflow-hidden flex flex-col"
        style="
          background: var(--surface-strong);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid var(--surface-border);
          box-shadow:
            0 8px 32px rgba(20, 35, 25, 0.55),
            inset 0 1px 0 var(--surface-tinted);
        "
      >
        <!-- Drag handle -->
        <div
          class="flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing shrink-0"
          style="border-bottom: 1px solid var(--surface-tinted)"
          @mousedown="onDragStart"
        >
          <span
            class="h-1.5 w-1.5 rounded-full animate-pulse"
            style="background: rgb(99, 102, 241)"
          />
          <p class="text-xs font-semibold flex-1" style="color: var(--ink-soft)">En direct</p>
          <button
            class="rounded-md p-0.5 transition-colors"
            style="color: var(--ink-faint)"
            title="Fermer"
            @mousedown.stop
            @click="voice.closeMediaPanel()"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </div>

        <!-- Focused feed -->
        <div v-if="focusedFeed" class="relative shrink-0" style="background: #0a0a0f">
          <video
            :key="focusedFeed.key + '-focused'"
            :ref="(el) => setVideoRef('focused', el, focusedFeed?.track ?? null)"
            autoplay
            playsinline
            muted
            class="w-full block"
            :style="{
              aspectRatio: focusedFeed.type === 'screen' ? '16/9' : '4/3',
              objectFit: 'cover',
              transform: focusedFeed.mirror ? 'scaleX(-1)' : 'none',
            }"
          />
          <!-- Name overlay -->
          <div
            class="absolute bottom-2 left-2 rounded-md px-2 py-0.5 text-xs font-medium"
            style="
              background: rgba(20, 35, 25, 0.55);
              color: var(--ink);
              backdrop-filter: blur(4px);
            "
          >
            {{ focusedFeed.name }}
            <span v-if="focusedFeed.type === 'screen'" style="color: rgba(99, 102, 241, 0.9)">
              · écran</span
            >
          </div>
        </div>

        <!-- Resize handle — right edge -->
        <div
          class="absolute top-0 right-0 h-full w-2 cursor-ew-resize opacity-0 hover:opacity-100 transition-opacity"
          style="background: linear-gradient(to right, transparent, rgba(99, 102, 241, 0.4))"
          @mousedown="onResizeStart"
        />

        <!-- Thumbnail strip — shown only when multiple feeds -->
        <div v-if="thumbnails.length" class="flex gap-1.5 px-2 py-2 overflow-x-auto shrink-0">
          <button
            v-for="feed in thumbnails"
            :key="feed.key"
            class="relative shrink-0 rounded-lg overflow-hidden"
            style="
              width: 72px;
              height: 54px;
              background: #111118;
              border: 1px solid var(--surface-border);
            "
            @click="focusedKey = feed.key"
          >
            <video
              :ref="(el) => setVideoRef('thumb-' + feed.key, el, feed.track)"
              autoplay
              playsinline
              muted
              class="w-full h-full object-cover"
              :style="{ transform: feed.mirror ? 'scaleX(-1)' : 'none' }"
            />
            <div
              class="absolute bottom-0 inset-x-0 px-1 py-0.5 text-center truncate"
              style="font-size: 9px; color: var(--ink-soft); background: rgba(0, 0, 0, 0.55)"
            >
              {{ feed.name }}
            </div>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.media-panel-enter-active,
.media-panel-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.media-panel-enter-from,
.media-panel-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.97);
}
</style>

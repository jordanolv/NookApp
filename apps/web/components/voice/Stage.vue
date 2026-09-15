<script setup lang="ts">
import { type LocalVideoTrack, type RemoteVideoTrack } from 'livekit-client';

type VideoTrack = LocalVideoTrack | RemoteVideoTrack;
type Tile = {
  key: string;
  name: string;
  track: VideoTrack | null;
  type: 'cam' | 'screen';
  mirror: boolean;
  userId: string;
};

const voice = useVoice();
const { user } = useAuth();
const presence = usePresence();
const character = useCharacter();

// The in-world character doubles as the avatar; presence carries every
// player's appearance already.
function appearanceOf(userId: string) {
  if (userId === user.value?.id) return character.appearance.value;
  return presence.players.value.get(userId)?.appearance ?? null;
}

const participants = voice.currentParticipants;

// One tile per member (avatar when the camera is off) plus one per screen share.
const tiles = computed((): Tile[] => {
  const out: Tile[] = [];
  for (const p of participants.value) {
    const isLocal = p.userId === user.value?.id;
    const media = isLocal
      ? { cam: voice.isCameraOn.value, screen: voice.isScreenSharing.value }
      : voice.participantMedia.value.get(p.userId);
    const camTrack = isLocal
      ? voice.localCameraTrack.value
      : voice.remoteVideoTracks.value.get(p.userId);
    const screenTrack = isLocal
      ? voice.localScreenTrack.value
      : voice.remoteScreenTracks.value.get(p.userId);

    out.push({
      key: isLocal ? 'local-cam' : `cam-${p.userId}`,
      name: p.name,
      track: media?.cam ? ((camTrack as VideoTrack | undefined) ?? null) : null,
      type: 'cam',
      mirror: isLocal,
      userId: p.userId,
    });

    if (media?.screen && screenTrack) {
      out.push({
        key: isLocal ? 'local-screen' : `screen-${p.userId}`,
        name: p.name,
        track: screenTrack as VideoTrack,
        type: 'screen',
        mirror: false,
        userId: p.userId,
      });
    }
  }
  return out;
});

// Cameras and screen shares get a full-width row; everyone else is chained
// into a single strip of avatars.
const videoTiles = computed(() => tiles.value.filter((t) => t.track));
const idleTiles = computed(() => tiles.value.filter((t) => t.type === 'cam' && !t.track));

const focusedKey = ref<string | null>(null);
const focusedTile = computed(() => tiles.value.find((tl) => tl.key === focusedKey.value) ?? null);
const visibleTiles = computed(() => (focusedTile.value ? [focusedTile.value] : videoTiles.value));

// Screen shares stay unsubscribed until asked for — a wall of live desktops
// costs bandwidth nobody wanted.
const watching = ref(new Set<string>());

function watchScreen(key: string) {
  watching.value = new Set(watching.value).add(key);
  focusedKey.value = key;
}

function isLive(tile: Tile) {
  return tile.type === 'cam' || watching.value.has(tile.key);
}

// NookWorld signals which feed to open on when a bubble is clicked
watch(
  () => voice.mediaPanelFocusKey.value,
  (key) => {
    if (key) watching.value = new Set(watching.value).add(key);
    focusedKey.value = key;
  },
);

function isSpeaking(userId: string) {
  return voice.activeSpeakers.value.has(userId);
}

function initial(name: string) {
  return name?.[0]?.toUpperCase() ?? '?';
}

// ─── Fullscreen ──────────────────────────────────────────────────────

const rootEl = ref<HTMLElement | null>(null);
const isFullscreen = ref(false);

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else rootEl.value?.requestFullscreen().catch(() => {});
}

function onFullscreenChange() {
  isFullscreen.value = document.fullscreenElement === rootEl.value;
}

onMounted(() => document.addEventListener('fullscreenchange', onFullscreenChange));

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
  document.removeEventListener('fullscreenchange', onFullscreenChange);
});
</script>

<template>
  <div ref="rootEl" class="stage">
    <div class="stage__bar">
      <button v-if="focusedTile" class="stage__btn" type="button" @click="focusedKey = null">
        ‹ Tous
      </button>
      <span class="stage__count">
        {{ focusedTile ? focusedTile.name : `${participants.length} en vocal` }}
      </span>
      <button
        class="stage__btn"
        type="button"
        :title="isFullscreen ? 'Quitter le plein écran' : 'Plein écran'"
        @click="toggleFullscreen()"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path
            v-if="!isFullscreen"
            d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"
          />
          <path
            v-else
            d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"
          />
        </svg>
      </button>
    </div>

    <ul v-if="idleTiles.length" class="strip">
      <li
        v-for="tile in idleTiles"
        :key="tile.key"
        class="strip__item"
        :class="{ 'strip__item--speaking': isSpeaking(tile.userId) }"
        :title="tile.name"
      >
        <UserCharacterAvatar
          v-if="appearanceOf(tile.userId)"
          :appearance="appearanceOf(tile.userId)!"
          :size="34"
        />
        <span v-else class="strip__initial">{{ initial(tile.name) }}</span>
      </li>
    </ul>

    <div class="stage__grid" :class="{ 'stage__grid--focused': !!focusedTile }">
      <button
        v-for="tile in visibleTiles"
        :key="tile.key"
        type="button"
        class="tile"
        :class="{ 'tile--speaking': isSpeaking(tile.userId) }"
        @click="focusedKey = focusedTile ? null : tile.key"
        @dblclick="toggleFullscreen()"
      >
        <video
          v-if="tile.track && isLive(tile)"
          :ref="(el) => setVideoRef(tile.key, el, tile.track)"
          autoplay
          playsinline
          muted
          class="tile__video"
          :style="{
            objectFit: tile.type === 'screen' ? 'contain' : 'cover',
            transform: tile.mirror ? 'scaleX(-1)' : 'none',
          }"
        />
        <span
          v-else-if="tile.type === 'screen'"
          class="tile__watch"
          @click.stop="watchScreen(tile.key)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"
            />
          </svg>
          Regarder le partage
        </span>
        <span v-else class="tile__avatar">{{ initial(tile.name) }}</span>
        <span class="tile__name">
          {{ tile.name
          }}<span v-if="tile.type === 'screen'" style="color: rgb(134, 239, 172)"> · écran</span>
        </span>
      </button>

      <p v-if="!tiles.length" class="stage__empty">Rejoins un salon vocal</p>
    </div>
  </div>
</template>

<style scoped>
.stage {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.stage__bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  flex-shrink: 0;
}
.stage__count {
  flex: 1;
  min-width: 0;
  font-size: 10px;
  font-weight: 600;
  color: var(--ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.stage__btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 5px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 10px;
  color: var(--ink-muted);
  cursor: pointer;
}
.stage__btn:hover {
  background: var(--surface-tinted);
  color: var(--ink);
}

.stage__grid {
  display: grid;
  grid-template-columns: 1fr;
  align-content: start;
  gap: 5px;
  padding: 0 8px 8px;
  overflow-y: auto;
  min-height: 0;
}
.stage__grid--focused {
  grid-template-columns: 1fr;
}

.tile {
  position: relative;
  aspect-ratio: 16 / 9;
  border: 1px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  background: #0a0a0f;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.tile--speaking {
  border-color: rgb(34, 197, 94);
}
.tile__video {
  width: 100%;
  height: 100%;
  display: block;
}
.tile__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 13px;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, #6366f1, #4338ca);
}
.tile__watch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  background: rgb(79, 70, 229);
}
.tile__watch:hover {
  background: rgb(99, 102, 241);
}

.tile__name {
  position: absolute;
  left: 4px;
  bottom: 4px;
  max-width: calc(100% - 8px);
  padding: 1px 5px;
  border-radius: 5px;
  font-size: 9px;
  color: var(--ink);
  background: rgba(10, 10, 15, 0.62);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.strip {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0 8px 8px;
  list-style: none;
  flex-shrink: 0;
}
.strip__item {
  display: flex;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px transparent;
}
.strip__item--speaking {
  box-shadow: 0 0 0 2px rgb(34, 197, 94);
}
.strip__initial {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, #6366f1, #4338ca);
}

.stage__empty {
  margin: 0;
  padding: 8px;
  font-size: 11px;
  font-style: italic;
  color: var(--ink-muted);
}

.stage:fullscreen {
  padding: 12px;
  background: #0a0a0f;
}
.stage:fullscreen .stage__grid {
  align-content: center;
}
.stage:fullscreen .stage__grid--focused .tile {
  aspect-ratio: auto;
  height: 100%;
}
</style>

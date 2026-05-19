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
const { store } = useServers();
const { user } = useAuth();
const { t } = useI18n();

const currentChannel = computed(
  () => store.voiceChannels.find((ch) => ch.id === voice.currentChannelId.value) ?? null,
);

const members = computed(() => {
  const id = voice.currentChannelId.value;
  if (!id) return [];
  return voice.voicePresence.value.get(id) ?? [];
});

const sortedMembers = computed(() =>
  [...members.value].sort((a, b) => {
    const aSelf = a.userId === user.value?.id ? 0 : 1;
    const bSelf = b.userId === user.value?.id ? 0 : 1;
    if (aSelf !== bSelf) return aSelf - bSelf;
    return a.name.localeCompare(b.name);
  }),
);

const feeds = computed<Feed[]>(() => {
  const out: Feed[] = [];
  if (voice.isCameraOn.value && voice.localCameraTrack.value) {
    out.push({
      key: 'local-cam',
      name: t('voice.members.you'),
      track: voice.localCameraTrack.value as VideoTrack,
      type: 'cam',
      mirror: true,
    });
  }
  for (const p of members.value) {
    if (p.userId === user.value?.id) continue;
    if (voice.participantMedia.value.get(p.userId)?.cam) {
      const track = voice.remoteVideoTracks.value.get(p.userId) as RemoteVideoTrack | undefined;
      if (track)
        out.push({ key: `cam-${p.userId}`, name: p.name, track, type: 'cam', mirror: false });
    }
    if (voice.participantMedia.value.get(p.userId)?.screen) {
      const track = voice.remoteScreenTracks.value.get(p.userId) as RemoteVideoTrack | undefined;
      if (track)
        out.push({
          key: `screen-${p.userId}`,
          name: p.name,
          track,
          type: 'screen',
          mirror: false,
        });
    }
  }
  return out;
});

function isSpeaking(userId: string) {
  return voice.activeSpeakers.value.has(userId);
}

function media(userId: string) {
  return voice.participantMedia.value.get(userId);
}

function initial(name: string) {
  return name?.[0]?.toUpperCase() ?? '?';
}

const attached = new Map<string, { el: HTMLVideoElement; track: VideoTrack }>();

function setVideoRef(key: string, el: unknown, track: VideoTrack | null) {
  const existing = attached.get(key);
  if (existing && existing.el !== el) {
    existing.track.detach(existing.el);
    attached.delete(key);
  }
  if (el instanceof HTMLVideoElement && track) {
    track.attach(el);
    attached.set(key, { el, track });
  }
}

onBeforeUnmount(() => {
  for (const { el, track } of attached.values()) track.detach(el);
  attached.clear();
});
</script>

<template>
  <aside class="voice-column">
    <header class="voice-column__header">
      <div class="voice-column__title">
        <span
          class="voice-column__dot"
          :class="{ 'voice-column__dot--live': voice.currentChannelId.value }"
        />
        <span>{{ t('lobby.voice.title') }}</span>
      </div>
      <p v-if="currentChannel" class="voice-column__channel">/ {{ currentChannel.name }}</p>
    </header>

    <div v-if="!voice.currentChannelId.value" class="voice-column__empty">
      <p class="voice-column__empty-title">{{ t('lobby.voice.notConnected') }}</p>
      <p class="voice-column__empty-hint">{{ t('lobby.voice.joinHint') }}</p>
    </div>

    <template v-else>
      <section v-if="feeds.length" class="voice-column__feeds">
        <div
          v-for="feed in feeds"
          :key="feed.key"
          class="voice-column__feed"
          :class="{ 'voice-column__feed--screen': feed.type === 'screen' }"
        >
          <video
            :ref="(el) => setVideoRef(feed.key, el, feed.track)"
            autoplay
            playsinline
            muted
            :style="{ transform: feed.mirror ? 'scaleX(-1)' : 'none' }"
          />
          <span class="voice-column__feed-label">
            {{ feed.name
            }}<span v-if="feed.type === 'screen'" class="voice-column__feed-tag"
              >· {{ t('voice.labels.screen') }}</span
            >
          </span>
        </div>
      </section>

      <section class="voice-column__members">
        <ul>
          <li
            v-for="m in sortedMembers"
            :key="m.userId"
            class="voice-member"
            :class="{ 'voice-member--speaking': isSpeaking(m.userId) }"
          >
            <div class="voice-member__avatar-wrap">
              <div class="voice-member__avatar">{{ initial(m.name) }}</div>
              <span
                v-if="isSpeaking(m.userId)"
                class="voice-member__speaking-ring"
                aria-hidden="true"
              />
            </div>
            <span class="voice-member__name" :title="m.name">
              {{ m.name
              }}<span v-if="m.userId === user?.id" class="voice-member__you">
                ({{ t('voice.members.you') }})</span
              >
            </span>
            <div class="voice-member__icons">
              <span
                v-if="media(m.userId)?.cam"
                class="voice-member__icon"
                :title="t('voice.labels.camera')"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"
                  />
                </svg>
              </span>
              <span
                v-if="media(m.userId)?.screen"
                class="voice-member__icon"
                :title="t('voice.labels.screen')"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"
                  />
                </svg>
              </span>
            </div>
          </li>
          <li v-if="!sortedMembers.length" class="voice-empty">{{ t('voice.members.empty') }}</li>
        </ul>
      </section>

      <footer class="voice-column__controls">
        <button
          class="voice-ctrl"
          :class="{ 'voice-ctrl--alert': voice.isMuted.value }"
          :title="voice.isMuted.value ? t('voice.unmute') : t('voice.mute')"
          @click="voice.toggleMute"
        >
          <svg
            v-if="!voice.isMuted.value"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path
              d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm6-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
            />
          </svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"
            />
          </svg>
        </button>
        <button
          class="voice-ctrl"
          :class="{ 'voice-ctrl--alert': voice.isDeafened.value }"
          :title="voice.isDeafened.value ? t('voice.undeafen') : t('voice.deafen')"
          @click="voice.toggleDeafen"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"
            />
          </svg>
        </button>
        <button
          class="voice-ctrl"
          :class="{ 'voice-ctrl--active': voice.isCameraOn.value }"
          :title="voice.isCameraOn.value ? t('voice.disableCamera') : t('voice.enableCamera')"
          @click="voice.toggleCamera"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"
            />
          </svg>
        </button>
        <button
          class="voice-ctrl"
          :class="{ 'voice-ctrl--active': voice.isScreenSharing.value }"
          :title="voice.isScreenSharing.value ? t('voice.stopSharing') : t('voice.shareScreen')"
          @click="voice.toggleScreenShare"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"
            />
          </svg>
        </button>
        <button
          class="voice-ctrl voice-ctrl--leave"
          :title="t('voice.leave')"
          @click="voice.leaveExplicit"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"
            />
          </svg>
        </button>
      </footer>
    </template>
  </aside>
</template>

<style scoped>
.voice-column {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(10, 10, 16, 0.6);
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.voice-column__header {
  padding: 16px 18px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.voice-column__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.7);
}

.voice-column__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}

.voice-column__dot--live {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.6);
  animation: voice-column-pulse 1.6s ease-in-out infinite;
}

@keyframes voice-column-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.voice-column__channel {
  margin: 6px 0 0;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
}

.voice-column__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
}

.voice-column__empty-title {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
  margin: 0 0 6px;
}

.voice-column__empty-hint {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  margin: 0;
}

.voice-column__feeds {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  max-height: 50%;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
}

.voice-column__feed {
  position: relative;
  width: 100%;
  border-radius: 10px;
  overflow: hidden;
  background: #0a0a10;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.voice-column__feed video {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  aspect-ratio: 4 / 3;
}

.voice-column__feed--screen video {
  aspect-ratio: 16 / 9;
}

.voice-column__feed-label {
  position: absolute;
  bottom: 6px;
  left: 6px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.6);
  font-size: 10px;
  color: rgba(255, 255, 255, 0.9);
}

.voice-column__feed-tag {
  margin-left: 4px;
  color: rgba(129, 140, 248, 0.85);
}

.voice-column__members {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 6px 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
}

.voice-column__members ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.voice-member {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
}

.voice-member:hover {
  background: rgba(255, 255, 255, 0.03);
}

.voice-member__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.voice-member__avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
}

.voice-member__speaking-ring {
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  border: 2px solid #22c55e;
  pointer-events: none;
  animation: voice-member-pulse 1.2s ease-in-out infinite;
}

@keyframes voice-member-pulse {
  0%,
  100% {
    opacity: 0.65;
  }
  50% {
    opacity: 1;
  }
}

.voice-member__name {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.78);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.voice-member--speaking .voice-member__name {
  color: rgb(134, 239, 172);
}

.voice-member__you {
  color: rgba(255, 255, 255, 0.35);
  font-weight: 400;
}

.voice-member__icons {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  color: rgba(129, 140, 248, 0.85);
}

.voice-empty {
  padding: 14px 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  text-align: center;
}

.voice-column__controls {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  padding: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.voice-ctrl {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 0;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.55);
  transition:
    background 120ms,
    color 120ms;
}

.voice-ctrl:hover {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
}

.voice-ctrl--active {
  background: rgba(99, 102, 241, 0.18);
  color: rgb(165, 180, 252);
}

.voice-ctrl--alert {
  background: rgba(239, 68, 68, 0.18);
  color: rgb(248, 113, 113);
}

.voice-ctrl--leave:hover {
  background: rgba(239, 68, 68, 0.18);
  color: rgb(248, 113, 113);
}
</style>

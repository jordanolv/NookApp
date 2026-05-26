<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  Eye,
  Hand,
  Headphones,
  HeadphoneOff,
  LogOut,
  MessageCircle,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  Smile,
  Video,
  VideoOff,
} from 'lucide-vue-next';
import { useHudVisibility } from '~/composables/useHudVisibility';

defineProps<{
  serverName: string;
  bannerUrl?: string | null;
}>();

const emit = defineEmits<{
  'open-server-switcher': [event: MouseEvent];
  wave: [];
}>();

const { t } = useI18n({ useScope: 'global' });
const voice = useVoice();
const {
  currentChannelId,
  isMuted,
  isDeafened,
  isCameraOn,
  isScreenSharing,
  leaveExplicit,
  toggleMute,
  toggleDeafen,
  toggleCamera,
  toggleScreenShare,
} = voice;

const hudVis = useHudVisibility();
const onlineHidden = hudVis.isHidden('ui:hud:onlineWidgetHidden');

const inCall = computed(() => !!currentChannelId.value);

const showStatus = ref(false);
const showDms = ref(false);
const waving = ref(false);

function onWave() {
  waving.value = true;
  setTimeout(() => {
    waving.value = false;
  }, 600);
  emit('wave');
}

function restoreOnline() {
  hudVis.setHidden('ui:hud:onlineWidgetHidden', false);
}
</script>

<template>
  <div class="dock">
    <button
      type="button"
      class="dock__nook"
      :title="serverName || ''"
      @click="emit('open-server-switcher', $event)"
    >
      <img v-if="bannerUrl" :src="bannerUrl" :alt="serverName" class="dock__nook-img" />
      <span v-else class="dock__nook-fallback">
        {{ serverName?.[0]?.toUpperCase() ?? '?' }}
      </span>
      <span class="dock__nook-status" />
    </button>

    <span class="dock__sep" aria-hidden="true" />

    <!-- World actions -->
    <button
      type="button"
      class="dock__btn"
      :class="{ 'dock__btn--active': waving }"
      title="Saluer (wave)"
      @click="onWave"
    >
      <Hand :size="16" />
    </button>
    <button type="button" class="dock__btn" title="Messages privés" @click="showDms = true">
      <MessageCircle :size="16" />
    </button>
    <div class="dock__status-wrap">
      <button
        type="button"
        class="dock__btn"
        :class="{ 'dock__btn--active': showStatus }"
        title="Statut"
        @click="showStatus = !showStatus"
      >
        <Smile :size="16" />
      </button>
      <div v-if="showStatus" class="dock__status-veil" @click="showStatus = false" />
      <Transition name="status-pop">
        <div v-if="showStatus" class="dock__status-anchor">
          <WorldHudStatusPickerPopover @close="showStatus = false" />
        </div>
      </Transition>
    </div>
    <button
      v-if="onlineHidden"
      type="button"
      class="dock__btn"
      title="Afficher le compteur en ligne"
      @click="restoreOnline"
    >
      <Eye :size="16" />
    </button>

    <!-- Voice controls (only when in a voice channel) -->
    <template v-if="inCall">
      <span class="dock__sep" aria-hidden="true" />
      <button
        type="button"
        class="dock__btn"
        :class="{ 'dock__btn--danger': isMuted }"
        :title="isMuted ? t('voice.unmute') : t('voice.mute')"
        @click="toggleMute"
      >
        <component :is="isMuted ? MicOff : Mic" :size="16" />
      </button>
      <button
        type="button"
        class="dock__btn"
        :class="{ 'dock__btn--danger': isDeafened }"
        :title="isDeafened ? t('voice.undeafen') : t('voice.deafen')"
        @click="toggleDeafen"
      >
        <component :is="isDeafened ? HeadphoneOff : Headphones" :size="16" />
      </button>
      <button
        type="button"
        class="dock__btn"
        :class="{ 'dock__btn--active': isCameraOn }"
        :title="isCameraOn ? t('voice.disableCamera') : t('voice.enableCamera')"
        @click="toggleCamera"
      >
        <component :is="isCameraOn ? Video : VideoOff" :size="16" />
      </button>
      <button
        type="button"
        class="dock__btn"
        :class="{ 'dock__btn--active': isScreenSharing }"
        :title="isScreenSharing ? t('voice.stopSharing') : t('voice.shareScreen')"
        @click="toggleScreenShare"
      >
        <component :is="isScreenSharing ? MonitorOff : MonitorUp" :size="16" />
      </button>
    </template>

    <template v-if="inCall">
      <span class="dock__sep" aria-hidden="true" />
      <button
        type="button"
        class="dock__btn dock__btn--leave"
        :title="t('voice.leave')"
        @click="leaveExplicit"
      >
        <LogOut :size="16" />
      </button>
    </template>

    <WorldHudDmsPlaceholderModal v-if="showDms" @close="showDms = false" />
  </div>
</template>

<style scoped>
.dock {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-soft);
  backdrop-filter: blur(28px) saturate(1.6);
  -webkit-backdrop-filter: blur(28px) saturate(1.6);
}

.dock__nook {
  position: relative;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 11px;
  overflow: hidden;
  background: linear-gradient(135deg, var(--accent-violet), var(--accent-cool));
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.16);
  transition:
    transform 0.15s,
    border-radius 0.15s;
}
.dock__nook:hover {
  transform: translateY(-1px);
  border-radius: 14px;
}
.dock__nook-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.dock__nook-fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
}
.dock__nook-status {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--accent-leaf);
  border: 2px solid var(--surface-strong);
}

.dock__sep {
  width: 1px;
  height: 22px;
  background: var(--surface-divider);
  flex-shrink: 0;
  margin: 0 2px;
}

.dock__btn {
  position: relative;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--ink-muted);
  display: grid;
  place-items: center;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    transform 0.15s;
}
.dock__btn:hover {
  background: var(--surface-tinted);
  color: var(--ink);
  transform: translateY(-1px);
}
.dock__btn--active {
  background: var(--accent-leaf-soft);
  color: var(--accent-leaf);
}
.dock__btn--active:hover {
  background: var(--accent-leaf-soft);
  color: var(--accent-leaf);
}
.dock__btn--danger {
  background: var(--accent-rose-soft);
  color: var(--accent-rose);
}
.dock__btn--danger:hover {
  background: var(--accent-rose-soft);
  color: var(--accent-rose);
}
.dock__btn--leave:hover {
  background: var(--accent-rose-soft);
  color: var(--accent-rose);
}

.dock__status-wrap {
  position: relative;
}
.dock__status-veil {
  position: fixed;
  inset: 0;
  z-index: 39;
}
.dock__status-anchor {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 41;
}

.status-pop-enter-active,
.status-pop-leave-active {
  transition:
    opacity 140ms,
    transform 140ms;
}
.status-pop-enter-from,
.status-pop-leave-to {
  opacity: 0;
  transform: translate(-50%, 6px);
}
</style>

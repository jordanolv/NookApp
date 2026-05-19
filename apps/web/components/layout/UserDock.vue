<script setup lang="ts">
import { computed } from 'vue';
import {
  Mic,
  MicOff,
  Headphones,
  HeadphoneOff,
  Settings,
  LogOut,
  Video,
  VideoOff,
  MonitorUp,
  MonitorOff,
} from 'lucide-vue-next';

const { user } = useAuth();
const { store } = useServers();
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
} = useVoice();
const { t } = useI18n();

const currentChannel = computed(
  () => store.voiceChannels.find((ch) => ch.id === currentChannelId.value) ?? null,
);

const showUserMenu = ref(false);
const menuPos = ref<{ left: number; bottom: number } | null>(null);
const showUserSettings = ref(false);

function openUserMenu(e: MouseEvent) {
  if (!import.meta.client) return;
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  menuPos.value = { left: rect.left, bottom: window.innerHeight - rect.top + 6 };
  showUserMenu.value = true;
}

function closeUserMenu() {
  showUserMenu.value = false;
}

function openUserSettings() {
  showUserMenu.value = false;
  showUserSettings.value = true;
}
</script>

<template>
  <div class="user-dock">
    <button type="button" class="user-row" :title="user?.name ?? ''" @click="openUserMenu">
      <div class="user-row__avatar">
        <div class="user-row__avatar-bg">
          {{ user?.name?.[0]?.toUpperCase() ?? '?' }}
        </div>
        <span
          class="user-row__status-dot"
          :style="{ background: currentChannelId ? '#22c55e' : 'rgba(255,255,255,0.25)' }"
        />
      </div>
      <div class="user-row__info">
        <span class="user-row__name">{{ user?.name }}</span>
        <span class="user-row__status" :style="currentChannelId ? 'color:#4ade80' : ''">
          {{ currentChannelId ? currentChannel?.name : t('voice.status.inNook') }}
        </span>
      </div>
    </button>

    <div class="user-row__controls" @mousedown.stop>
      <button
        type="button"
        class="ctrl-btn"
        :class="{ 'ctrl-btn--danger': isMuted }"
        :title="isMuted ? t('voice.unmute') : t('voice.mute')"
        @click="toggleMute"
      >
        <component :is="isMuted ? MicOff : Mic" :size="14" />
      </button>
      <button
        type="button"
        class="ctrl-btn"
        :class="{ 'ctrl-btn--danger': isDeafened }"
        :title="isDeafened ? t('voice.undeafen') : t('voice.deafen')"
        @click="toggleDeafen"
      >
        <component :is="isDeafened ? HeadphoneOff : Headphones" :size="14" />
      </button>
      <button
        v-if="currentChannelId"
        type="button"
        class="ctrl-btn"
        :class="{ 'ctrl-btn--active': isCameraOn }"
        :title="isCameraOn ? t('voice.disableCamera') : t('voice.enableCamera')"
        @click="toggleCamera"
      >
        <component :is="isCameraOn ? Video : VideoOff" :size="14" />
      </button>
      <button
        v-if="currentChannelId"
        type="button"
        class="ctrl-btn"
        :class="{ 'ctrl-btn--active': isScreenSharing }"
        :title="isScreenSharing ? t('voice.stopSharing') : t('voice.shareScreen')"
        @click="toggleScreenShare"
      >
        <component :is="isScreenSharing ? MonitorOff : MonitorUp" :size="14" />
      </button>
      <button
        v-if="currentChannelId"
        type="button"
        class="ctrl-btn ctrl-btn--leave"
        :title="t('voice.leave')"
        @click="leaveExplicit"
      >
        <LogOut :size="14" />
      </button>
      <button
        type="button"
        class="ctrl-btn"
        :title="t('voice.accountSettings')"
        @click="openUserSettings"
      >
        <Settings :size="14" />
      </button>
    </div>

    <Teleport to="body">
      <template v-if="showUserMenu && menuPos">
        <div class="user-menu__backdrop" @click="closeUserMenu" />
        <div
          class="user-menu"
          :style="{
            left: `${menuPos.left}px`,
            bottom: `${menuPos.bottom}px`,
          }"
        >
          <button class="user-menu__item" @click="openUserSettings">
            <Settings :size="13" />
            <span>{{ t('voice.accountSettings') }}</span>
          </button>
        </div>
      </template>
    </Teleport>

    <UserSettingsModal v-if="showUserSettings" @close="showUserSettings = false" />
  </div>
</template>

<style scoped>
.user-dock {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 14px 12px;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 0;
  min-width: 0;
  padding: 4px 6px;
  margin: -4px -6px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 120ms;
}
.user-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.user-row__avatar {
  position: relative;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
}
.user-row__avatar-bg {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.user-row__status-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(15, 15, 20, 0.95);
}

.user-row__info {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.user-row__name {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-row__status {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-row__controls {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  transition:
    background 120ms,
    color 120ms;
}
.ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.9);
}
.ctrl-btn--danger {
  background: rgba(239, 68, 68, 0.15);
  color: rgb(248, 113, 113);
}
.ctrl-btn--danger:hover {
  background: rgba(239, 68, 68, 0.22);
  color: rgb(248, 113, 113);
}
.ctrl-btn--active {
  background: rgba(34, 197, 94, 0.15);
  color: rgb(74, 222, 128);
}
.ctrl-btn--active:hover {
  background: rgba(34, 197, 94, 0.22);
  color: rgb(74, 222, 128);
}
.ctrl-btn--leave:hover {
  background: rgba(239, 68, 68, 0.18);
  color: rgb(248, 113, 113);
}

.user-menu__backdrop {
  position: fixed;
  inset: 0;
  z-index: 70;
}
.user-menu {
  position: fixed;
  z-index: 71;
  min-width: 180px;
  display: flex;
  flex-direction: column;
  padding: 4px;
  border-radius: 10px;
  background: rgba(10, 10, 16, 0.96);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
}
.user-menu__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  color: rgba(255, 255, 255, 0.8);
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 120ms;
}
.user-menu__item:hover {
  background: rgba(255, 255, 255, 0.06);
}
</style>

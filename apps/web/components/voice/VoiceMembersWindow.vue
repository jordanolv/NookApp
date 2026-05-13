<script setup lang="ts">
const { currentChannelId, voicePresence, activeSpeakers, participantMedia } = useVoice();
const { store } = useServers();
const { user } = useAuth();
const { t } = useI18n();

const currentChannel = computed(
  () => store.voiceChannels.find((ch) => ch.id === currentChannelId.value) ?? null,
);

const members = computed(() => {
  const chId = currentChannelId.value;
  if (!chId) return [];
  return voicePresence.value.get(chId) ?? [];
});

const sortedMembers = computed(() =>
  [...members.value].sort((a, b) => {
    const aSelf = a.userId === user.value?.id ? 0 : 1;
    const bSelf = b.userId === user.value?.id ? 0 : 1;
    if (aSelf !== bSelf) return aSelf - bSelf;
    return a.name.localeCompare(b.name);
  }),
);

function isSpeaking(userId: string) {
  return activeSpeakers.value.has(userId);
}

function media(userId: string) {
  return participantMedia.value.get(userId);
}

function initial(name: string) {
  return name?.[0]?.toUpperCase() ?? '?';
}
</script>

<template>
  <UiFloatingWindow
    v-if="currentChannelId"
    :title="
      currentChannel
        ? `${t('voice.members.title')} · ${currentChannel.name} (${sortedMembers.length})`
        : t('voice.members.title')
    "
    :initial-width="240"
    :initial-height="320"
    :min-width="200"
    :min-height="200"
    :max-width="480"
    :max-height="720"
    :initial-x="24"
    :initial-y="240"
    :show-close="false"
    surface="rail"
    persist-key="voice:members:pos"
  >
    <ul class="voice-members-list">
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
      <li v-if="sortedMembers.length === 0" class="voice-members-empty">
        {{ t('voice.members.empty') }}
      </li>
    </ul>
  </UiFloatingWindow>
</template>

<style scoped>
.voice-members-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px;
  margin: 0;
  list-style: none;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.voice-member {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 8px;
  transition: background-color 0.15s;
}
.voice-member:hover {
  background: rgba(255, 255, 255, 0.04);
}

.voice-member__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.voice-member__avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
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
  animation: voice-pulse 1.2s ease-in-out infinite;
}

@keyframes voice-pulse {
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
  font-size: 11px;
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

.voice-member__icon {
  display: inline-flex;
}

.voice-members-empty {
  padding: 8px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  text-align: center;
}
</style>

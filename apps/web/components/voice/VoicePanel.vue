<script setup lang="ts">
const {
  currentChannelId,
  isMuted,
  isDeafened,
  isCameraOn,
  voicePresence,
  activeSpeakers,
  leave,
  toggleMute,
  toggleDeafen,
  toggleCamera,
} = useVoice();
const { store } = useServers();

const currentChannel = computed(
  () => store.voiceChannels.find((ch) => ch.id === currentChannelId.value) ?? null,
);

const participants = computed(() =>
  currentChannelId.value ? (voicePresence.value.get(currentChannelId.value) ?? []) : [],
);
</script>

<template>
  <Transition name="voice-panel">
    <div
      v-if="currentChannelId"
      class="absolute bottom-0 left-0 z-20 w-52 rounded-tr-xl bg-neutral-900 border-t border-r border-neutral-700 p-3 flex flex-col gap-2 select-none"
    >
      <!-- Channel header -->
      <div class="flex items-center gap-1.5">
        <span class="text-green-400 text-xs">🔊</span>
        <span class="flex-1 truncate text-xs font-semibold text-green-400">
          {{ currentChannel?.name ?? '...' }}
        </span>
        <span class="text-neutral-500 text-xs">Voice connected</span>
      </div>

      <!-- Participants -->
      <ul v-if="participants.length" class="flex flex-col gap-1">
        <li
          v-for="p in participants"
          :key="p.userId"
          class="flex items-center gap-1.5 rounded px-1 py-0.5"
          :class="activeSpeakers.has(p.userId) ? 'bg-green-900/30' : ''"
        >
          <span
            class="h-1.5 w-1.5 flex-shrink-0 rounded-full transition-colors"
            :class="activeSpeakers.has(p.userId) ? 'bg-green-400' : 'bg-neutral-600'"
          />
          <span class="truncate text-xs text-neutral-300">{{ p.name }}</span>
        </li>
      </ul>

      <!-- Controls -->
      <div class="flex items-center gap-1 pt-1 border-t border-neutral-800">
        <button
          class="flex-1 rounded p-1 text-xs font-medium transition-colors"
          :class="
            isMuted
              ? 'bg-red-700 text-white'
              : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
          "
          @click="toggleMute"
        >
          {{ isMuted ? 'Unmute' : 'Mute' }}
        </button>
        <button
          class="flex-1 rounded p-1 text-xs font-medium transition-colors"
          :class="
            isDeafened
              ? 'bg-red-700 text-white'
              : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
          "
          @click="toggleDeafen"
        >
          {{ isDeafened ? 'Undeaf' : 'Deafen' }}
        </button>
        <button
          class="flex-1 rounded p-1 text-xs font-medium transition-colors"
          :class="
            isCameraOn
              ? 'bg-indigo-600 text-white'
              : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200'
          "
          @click="toggleCamera"
        >
          Cam
        </button>
        <button
          class="rounded p-1 text-xs font-medium bg-red-800 text-white hover:bg-red-700 transition-colors"
          title="Leave channel"
          @click="leave"
        >
          ✕
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.voice-panel-enter-active,
.voice-panel-leave-active {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.voice-panel-enter-from,
.voice-panel-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>

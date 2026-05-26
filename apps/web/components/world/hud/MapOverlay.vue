<script setup lang="ts">
import type { ChannelPublic, MapData, VoiceParticipant } from '@nookapp/protocol';
import type { PresencePlayer } from '~/composables/usePresence';

defineProps<{
  mapData: MapData | null;
  voiceChannels: ChannelPublic[];
  players: Map<string, PresencePlayer>;
  voiceMembers: Map<string, VoiceParticipant[]>;
  currentUserId: string;
  currentUserName: string;
  currentVoiceChannelId: string | null;
}>();

const emit = defineEmits<{
  close: [];
  'teleport-to': [x: number, y: number];
}>();
</script>

<template>
  <UiFloatingWindow
    title="Carte du monde"
    :initial-width="540"
    :initial-height="540"
    :min-width="380"
    :min-height="380"
    persist-key="ui:floating:worldMap"
    @close="emit('close')"
  >
    <div class="map-overlay">
      <div class="map-overlay__scale">
        <WorldMinimap
          :map-data="mapData"
          :voice-channels="voiceChannels"
          :players="players"
          :voice-members="voiceMembers"
          :current-user-id="currentUserId"
          :current-user-name="currentUserName"
          :current-voice-channel-id="currentVoiceChannelId"
          @teleport-to="(x, y) => emit('teleport-to', x, y)"
        />
      </div>
    </div>
  </UiFloatingWindow>
</template>

<style scoped>
.map-overlay {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 20px;
}
.map-overlay__scale {
  transform: scale(2.2);
  transform-origin: center;
}
:deep(.minimap) {
  position: static !important;
}
</style>

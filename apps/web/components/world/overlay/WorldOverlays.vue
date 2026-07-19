<script setup lang="ts">
import NameTag from '../name-tag/NameTag.vue';
import CamBubble from './CamBubble.vue';
import VoiceRoomLabel from './VoiceRoomLabel.vue';
import ObjectLabel from './ObjectLabel.vue';
import type {
  NameTagOverlay,
  CamBubbleOverlay,
  VoiceRoomOverlay,
  ObjectLabelOverlay,
} from '~/composables/useWorldOverlays';

defineProps<{
  nameTags: readonly NameTagOverlay[];
  camBubbles: readonly CamBubbleOverlay[];
  voiceRooms: readonly VoiceRoomOverlay[];
  objectLabels: readonly ObjectLabelOverlay[];
}>();
</script>

<template>
  <div class="absolute inset-0 pointer-events-none">
    <NameTag
      v-for="t in nameTags"
      :key="t.userId"
      :name="t.name"
      :status="t.status"
      :media-icon-html="t.mediaIconHtml"
      :activity="t.activity"
      :x="t.x"
      :y="t.y"
    />
    <CamBubble
      v-for="b in camBubbles"
      :key="b.feedKey"
      :track="b.track"
      :mirror="b.mirror"
      :speaking="b.speaking"
      :x="b.x"
      :y="b.y"
    />
    <VoiceRoomLabel v-for="r in voiceRooms" :key="r.channelId" :name="r.name" :x="r.x" :y="r.y" />
    <ObjectLabel v-for="l in objectLabels" :key="l.id" :label="l.label" :x="l.x" :y="l.y" />
  </div>
</template>

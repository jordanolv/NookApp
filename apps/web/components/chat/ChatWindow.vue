<script setup lang="ts">
import { Settings } from 'lucide-vue-next';

const props = defineProps<{
  channelId: string;
  initialX: number;
  initialY: number;
  zIndex: number;
}>();

const emit = defineEmits<{
  close: [];
  focus: [];
  'drag-start': [];
  'drag-end': [x: number, y: number];
}>();

const route = useRoute();
const serverId = computed(() => route.params.serverId as string);
const { store } = useServers();
const { canManageChannels } = useMember();

const showEdit = ref(false);
const channel = computed(() => store.channels.find((c) => c.id === props.channelId) ?? null);
</script>

<template>
  <UiFloatingWindow
    :title="`# ${channel?.name ?? '…'}`"
    :initial-x="initialX"
    :initial-y="initialY"
    :initial-width="400"
    :initial-height="540"
    :min-width="300"
    :min-height="280"
    :z-index="zIndex"
    :close-on-escape="false"
    @close="emit('close')"
    @focus="emit('focus')"
    @drag-start="emit('drag-start')"
    @drag-end="(x, y) => emit('drag-end', x, y)"
  >
    <template #header-actions>
      <button
        v-if="canManageChannels && channel"
        class="rounded-lg p-1 transition-colors hover:bg-white/10"
        style="color: rgba(255, 255, 255, 0.4)"
        title="Modifier le canal"
        @click="showEdit = true"
      >
        <Settings :size="12" :stroke-width="1.75" />
      </button>
    </template>

    <ChatPane :channel-id="channelId" />

    <ChannelEditChannelModal
      v-if="showEdit && channel"
      :server-id="serverId"
      :channel="channel"
      @close="showEdit = false"
      @updated="showEdit = false"
    />
  </UiFloatingWindow>
</template>

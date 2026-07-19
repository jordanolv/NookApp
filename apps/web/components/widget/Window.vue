<script setup lang="ts">
import { getWidget } from '~/widgets/registry';

const props = defineProps<{
  serverId: string;
  channelId: string;
  channelName: string;
  widgetKind: string | null;
  initialX?: number | null;
  initialY?: number | null;
  zIndex?: number;
}>();

const emit = defineEmits<{
  close: [];
  focus: [];
  'drag-start': [];
  'drag-end': [x: number, y: number];
}>();

const widget = computed(() => getWidget(props.widgetKind));
const size = computed(() => widget.value?.defaultSize ?? { width: 640, height: 480 });
const minSize = computed(() => widget.value?.minSize ?? { width: 420, height: 320 });
</script>

<template>
  <UiFloatingWindow
    :title="channelName"
    :initial-width="size.width"
    :initial-height="size.height"
    :min-width="minSize.width"
    :min-height="minSize.height"
    :initial-x="initialX ?? null"
    :initial-y="initialY ?? null"
    :z-index="zIndex ?? 70"
    :close-on-escape="false"
    :persist-key="`widget:${channelId}`"
    @close="emit('close')"
    @focus="emit('focus')"
    @drag-start="emit('drag-start')"
    @drag-end="(x, y) => emit('drag-end', x, y)"
  >
    <component
      :is="widget.component"
      v-if="widget"
      :server-id="serverId"
      :channel-id="channelId"
      :channel-name="channelName"
    />
    <div v-else class="unknown-kind">
      <p class="title">Widget inconnu</p>
      <p class="hint">Kind « {{ widgetKind }} » non enregistré dans le registry.</p>
    </div>
  </UiFloatingWindow>
</template>

<style scoped>
.unknown-kind {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--ink-muted);
}
.title {
  font-size: 14px;
  font-weight: 700;
}
.hint {
  font-size: 11px;
  color: var(--ink-faint);
}
</style>

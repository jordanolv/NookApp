<script setup lang="ts">
import { Hash, MessageSquare, X, Plus, GripVertical } from 'lucide-vue-next';
import type { ChannelPublic } from '@nookapp/protocol';

const props = defineProps<{
  serverId: string;
  widgetIds: string[];
  dropActive?: boolean;
}>();

const emit = defineEmits<{
  close: [channelId: string];
  reorder: [channelIds: string[]];
  pick: [];
}>();

const { store } = useServers();

const widgets = computed<ChannelPublic[]>(() => {
  const byId = new Map(store.channels.map((c) => [c.id, c]));
  return props.widgetIds.map((id) => byId.get(id)).filter((c): c is ChannelPublic => !!c);
});

const dragKey = ref<string | null>(null);

function onDragStart(channelId: string, e: DragEvent) {
  dragKey.value = channelId;
  if (e.dataTransfer) {
    e.dataTransfer.setData('text/x-nookapp-widget', channelId);
    e.dataTransfer.effectAllowed = 'move';
  }
}

function onDragOver(channelId: string, e: DragEvent) {
  if (!dragKey.value || dragKey.value === channelId) return;
  e.preventDefault();
  const from = props.widgetIds.indexOf(dragKey.value);
  const to = props.widgetIds.indexOf(channelId);
  if (from < 0 || to < 0) return;
  const next = [...props.widgetIds];
  next.splice(from, 1);
  next.splice(to, 0, dragKey.value);
  emit('reorder', next);
}

function onDragEnd() {
  dragKey.value = null;
}
</script>

<template>
  <aside class="widget-bar" :class="{ 'widget-bar--drop-active': dropActive }">
    <header class="widget-bar__head">
      <div class="widget-bar__head-title">
        <span class="widget-bar__head-dot" />
        <span>Widgets</span>
        <span class="widget-bar__head-count">{{ widgets.length }}</span>
      </div>
      <button class="widget-bar__add" :title="'Pin a channel'" @click="emit('pick')">
        <Plus :size="13" :stroke-width="2.2" />
      </button>
    </header>

    <div v-if="!widgets.length" class="widget-bar__empty">
      <p class="widget-bar__empty-title">Drop a channel here</p>
      <p class="widget-bar__empty-hint">
        Drag any channel from the sidebar (or hit
        <Plus :size="10" :stroke-width="2.5" class="widget-bar__empty-icon" />) to keep a side chat
        alive while you focus on something else.
      </p>
    </div>

    <ul v-else class="widget-bar__stack">
      <li
        v-for="ch in widgets"
        :key="ch.id"
        class="widget"
        :class="{ 'widget--dragging': dragKey === ch.id }"
        :draggable="true"
        @dragstart="onDragStart(ch.id, $event)"
        @dragover="onDragOver(ch.id, $event)"
        @dragend="onDragEnd"
      >
        <header class="widget__head">
          <GripVertical :size="12" :stroke-width="2" class="widget__head-grip" />
          <component
            :is="ch.type === 'forum' ? MessageSquare : Hash"
            :size="13"
            :stroke-width="2.2"
            class="widget__head-icon"
          />
          <span class="widget__head-name">{{ ch.name }}</span>
          <button class="widget__head-close" :title="'Unpin'" @click="emit('close', ch.id)">
            <X :size="13" :stroke-width="2.2" />
          </button>
        </header>
        <ChatPane :channel-id="ch.id" class="widget__chat" />
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.widget-bar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(10, 10, 16, 0.72);
  border-left: 1px solid rgba(255, 255, 255, 0.06);
  overflow: hidden;
  transition:
    background 140ms,
    border-color 140ms;
}

.widget-bar--drop-active {
  background: rgba(99, 102, 241, 0.12);
  border-left-color: rgba(129, 140, 248, 0.6);
}

.widget-bar__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
}

.widget-bar__head-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.65);
}

.widget-bar__head-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgb(129, 140, 248);
  box-shadow: 0 0 6px rgba(129, 140, 248, 0.6);
}

.widget-bar__head-count {
  margin-left: auto;
  font-family: ui-monospace, 'SF Mono', monospace;
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  letter-spacing: 0;
}

.widget-bar__add {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.55);
  background: rgba(255, 255, 255, 0.04);
  transition:
    background 120ms,
    color 120ms;
}

.widget-bar__add:hover {
  background: rgba(99, 102, 241, 0.2);
  color: rgb(199, 210, 254);
}

.widget-bar__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 20px;
  text-align: center;
  border: 1px dashed rgba(255, 255, 255, 0.08);
  margin: 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
}

.widget-bar--drop-active .widget-bar__empty {
  border-color: rgba(129, 140, 248, 0.6);
  background: rgba(99, 102, 241, 0.12);
}

.widget-bar__empty-title {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

.widget-bar__empty-hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.4);
}

.widget-bar__empty-icon {
  display: inline-block;
  vertical-align: -1px;
  margin: 0 2px;
  color: rgba(255, 255, 255, 0.55);
}

.widget-bar__stack {
  flex: 1;
  list-style: none;
  margin: 0;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.08) transparent;
}

.widget {
  display: flex;
  flex-direction: column;
  min-height: 220px;
  flex: 1 1 220px;
  border-radius: 10px;
  background: rgba(15, 16, 24, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.07);
  overflow: hidden;
  transition:
    border-color 140ms,
    box-shadow 140ms;
}

.widget:hover {
  border-color: rgba(255, 255, 255, 0.12);
}

.widget--dragging {
  opacity: 0.5;
  border-color: rgba(129, 140, 248, 0.5);
}

.widget__head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px 6px 4px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: grab;
}

.widget__head:active {
  cursor: grabbing;
}

.widget__head-grip {
  color: rgba(255, 255, 255, 0.3);
}

.widget__head-icon {
  color: rgba(165, 180, 252, 0.85);
}

.widget__head-name {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.88);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.widget__head-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  color: rgba(255, 255, 255, 0.35);
  transition:
    background 120ms,
    color 120ms;
}

.widget__head-close:hover {
  background: rgba(239, 68, 68, 0.18);
  color: rgb(248, 113, 113);
}

.widget__chat {
  flex: 1;
  min-height: 0;
}
</style>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref } from 'vue';
import type { ChannelPublic, CategoryPublic } from '@nookapp/protocol';
import { ChevronDown, Folder } from 'lucide-vue-next';
import { CHANNEL_CARD_DATA, useChannelCardData } from '~/composables/useChannelCardData';
import ChannelEntry from './ChannelEntry.vue';

const props = defineProps<{
  channels: ChannelPublic[];
  categories: CategoryPublic[];
  activeChannelIds: Set<string>;
  currentVoiceId: string | null;
  canManage: boolean;
}>();

const emit = defineEmits<{
  select: [channel: ChannelPublic, event: MouseEvent];
  'edit-channel': [channelId: string];
  'edit-category': [categoryId: string];
}>();

const collapsed = ref<Set<string>>(new Set());
const expandedForums = ref<Set<string>>(new Set());
const ctxMenu = ref<{ type: 'channel' | 'category'; id: string; x: number; y: number } | null>(
  null,
);

function toggleSet(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

function toggleCategory(id: string) {
  collapsed.value = toggleSet(collapsed.value, id);
}
function toggleForum(id: string) {
  expandedForums.value = toggleSet(expandedForums.value, id);
}

function onChannelCtx(ch: ChannelPublic, e: MouseEvent) {
  if (!props.canManage) return;
  e.preventDefault();
  ctxMenu.value = { type: 'channel', id: ch.id, x: e.clientX, y: e.clientY };
}
function onCategoryCtx(cat: CategoryPublic, e: MouseEvent) {
  if (!props.canManage) return;
  e.preventDefault();
  ctxMenu.value = { type: 'category', id: cat.id, x: e.clientX, y: e.clientY };
}
function closeCtx() {
  ctxMenu.value = null;
}

onMounted(() => window.addEventListener('mousedown', closeCtx));
onUnmounted(() => window.removeEventListener('mousedown', closeCtx));

function childrenOf(parentId: string): ChannelPublic[] {
  return props.channels
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.position - b.position);
}

provide(CHANNEL_CARD_DATA, useChannelCardData({ childrenCount: (id) => childrenOf(id).length }));

const ungrouped = computed(() =>
  props.channels
    .filter((c) => !c.categoryId && !c.parentId)
    .sort((a, b) => a.position - b.position),
);

const grouped = computed(() =>
  props.categories
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((cat) => ({
      category: cat,
      channels: props.channels
        .filter((c) => c.categoryId === cat.id && !c.parentId)
        .sort((a, b) => a.position - b.position),
    }))
    .filter((g) => g.channels.length > 0),
);
</script>

<template>
  <div class="channels-list">
    <div v-if="ungrouped.length" class="channels-list__cards">
      <ChannelEntry
        v-for="ch in ungrouped"
        :key="ch.id"
        :channel="ch"
        :children="childrenOf(ch.id)"
        :active-ids="activeChannelIds"
        :forum-expanded="expandedForums.has(ch.id)"
        @select="(c, e) => emit('select', c, e)"
        @contextmenu="onChannelCtx"
        @toggle-forum="toggleForum(ch.id)"
      />
    </div>

    <div v-for="g in grouped" :key="g.category.id" class="channels-list__group">
      <button
        type="button"
        class="cat-header"
        :class="{ 'cat-header--collapsed': collapsed.has(g.category.id) }"
        :style="
          g.category.color
            ? { borderLeft: `3px solid ${g.category.color}`, paddingLeft: '5px' }
            : {}
        "
        @click="toggleCategory(g.category.id)"
        @contextmenu="onCategoryCtx(g.category, $event)"
      >
        <Folder :size="12" class="cat-header__icon" />
        <span class="cat-header__name">{{ g.category.name }}</span>
        <ChevronDown :size="12" class="cat-header__chevron" />
      </button>
      <div v-if="!collapsed.has(g.category.id)" class="channels-list__cards">
        <ChannelEntry
          v-for="ch in g.channels"
          :key="ch.id"
          :channel="ch"
          :children="childrenOf(ch.id)"
          :active-ids="activeChannelIds"
          :forum-expanded="expandedForums.has(ch.id)"
          @select="(c, e) => emit('select', c, e)"
          @contextmenu="onChannelCtx"
          @toggle-forum="toggleForum(ch.id)"
        />
      </div>
    </div>

    <div v-if="!ungrouped.length && !grouped.length" class="channels-list__empty">
      Aucun salon texte
    </div>

    <Teleport to="body">
      <div
        v-if="ctxMenu"
        class="ctx-menu"
        :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }"
        @mousedown.stop
      >
        <button
          class="ctx-menu__item"
          @click="
            ctxMenu!.type === 'channel'
              ? emit('edit-channel', ctxMenu!.id)
              : emit('edit-category', ctxMenu!.id);
            closeCtx();
          "
        >
          Modifier
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.channels-list {
  display: flex;
  flex-direction: column;
  padding: 0;
  gap: 6px;
}

.channels-list__group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.channels-list__cards {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.cat-header {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgba(165, 180, 252, 0.75);
}
.cat-header__icon {
  flex-shrink: 0;
}
.cat-header__name {
  flex: 1 1 0;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-align: left;
}
.cat-header__chevron {
  flex-shrink: 0;
  transition: transform 160ms;
  opacity: 0.6;
}
.cat-header--collapsed .cat-header__chevron {
  transform: rotate(-90deg);
}

.channels-list__empty {
  padding: 32px 12px;
  text-align: center;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
}

.ctx-menu {
  position: fixed;
  z-index: 200;
  min-width: 140px;
  padding: 4px;
  border-radius: 8px;
  background: rgba(10, 10, 16, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.09);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
}
.ctx-menu__item {
  display: block;
  width: 100%;
  padding: 6px 10px;
  text-align: left;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  background: transparent;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background 100ms;
}
.ctx-menu__item:hover {
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.95);
}
</style>

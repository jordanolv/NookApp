<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ChannelPublic, CategoryPublic } from '@nookapp/protocol';
import { Hash, MessageSquare, Gamepad2, Sticker, ChevronDown, Folder } from 'lucide-vue-next';
import { useMessagesStore } from '~/stores/messages';
import { getChannelStat } from '~/plugins-runtime';

const props = defineProps<{
  channels: ChannelPublic[];
  categories: CategoryPublic[];
  activeChannelIds: Set<string>;
  currentVoiceId: string | null;
}>();

const emit = defineEmits<{
  select: [channel: ChannelPublic, event: MouseEvent];
}>();

const messages = useMessagesStore();
const collapsed = ref<Set<string>>(new Set());
const expandedForums = ref<Set<string>>(new Set());

function toggleCategory(id: string) {
  if (collapsed.value.has(id)) collapsed.value.delete(id);
  else collapsed.value.add(id);
  collapsed.value = new Set(collapsed.value);
}

function toggleForum(channelId: string) {
  if (expandedForums.value.has(channelId)) expandedForums.value.delete(channelId);
  else expandedForums.value.add(channelId);
  expandedForums.value = new Set(expandedForums.value);
}

function handleCardClick(ch: ChannelPublic, e: MouseEvent) {
  if (ch.type === 'forum') {
    toggleForum(ch.id);
    return;
  }
  emit('select', ch, e);
}

function childrenOf(parentId: string): ChannelPublic[] {
  return props.channels
    .filter((c) => c.parentId === parentId)
    .sort((a, b) => a.position - b.position);
}

function iconFor(type: ChannelPublic['type']) {
  switch (type) {
    case 'forum':
      return MessageSquare;
    case 'game':
      return Gamepad2;
    case 'widget':
      return Sticker;
    case 'text':
    default:
      return Hash;
  }
}

// Deterministic hue per channel id (stable colour).
function hueFor(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 360;
}

function cardStyle(ch: ChannelPublic) {
  const hue = hueFor(ch.id);
  return {
    background: `
      linear-gradient(120deg,
        hsla(${hue}, 65%, 32%, 0.55) 0%,
        hsla(${hue}, 65%, 18%, 0.35) 55%,
        hsla(${(hue + 40) % 360}, 60%, 22%, 0.45) 100%
      ),
      rgba(15, 15, 22, 0.65)
    `,
  };
}

function iconBg(ch: ChannelPublic) {
  const hue = hueFor(ch.id);
  return {
    background: `linear-gradient(135deg, hsl(${hue}, 70%, 55%), hsl(${(hue + 30) % 360}, 70%, 45%))`,
  };
}

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

function isActive(ch: ChannelPublic): boolean {
  return props.activeChannelIds.has(ch.id);
}

function lastMessageOf(channelId: string) {
  const list = messages.byChannel[channelId];
  return list && list.length ? list[list.length - 1] : null;
}

const statCtx = {
  messageCount: (channelId: string) => messages.counts[channelId] ?? 0,
  childrenCount: (channelId: string) => childrenOf(channelId).length,
};

function statOf(ch: ChannelPublic) {
  return getChannelStat(ch, statCtx) ?? { num: 0, label: '' };
}

function authorLabel(authorId: string): string {
  return '@' + authorId.slice(0, 8);
}

function authorInitials(authorId: string): string {
  return authorId.slice(0, 2).toUpperCase();
}

function authorAvatarStyle(authorId: string) {
  const hue = hueFor(authorId);
  return {
    background: `linear-gradient(135deg, hsl(${hue}, 70%, 55%), hsl(${(hue + 40) % 360}, 70%, 42%))`,
  };
}

function snippet(content: string, max = 40): string {
  const oneLine = content.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? oneLine.slice(0, max - 1) + '…' : oneLine;
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}
</script>

<template>
  <div class="channels-list">
    <!-- Ungrouped -->
    <div v-if="ungrouped.length" class="channels-list__cards">
      <template v-for="ch in ungrouped" :key="ch.id">
        <button
          type="button"
          class="card"
          :class="{
            'card--active': isActive(ch),
            'card--forum-open': ch.type === 'forum' && expandedForums.has(ch.id),
          }"
          :style="cardStyle(ch)"
          @click="handleCardClick(ch, $event)"
        >
          <div class="card__icon" :style="iconBg(ch)">
            <component :is="iconFor(ch.type)" :size="14" stroke-width="2.4" />
          </div>
          <div class="card__text">
            <span class="card__name">
              {{ ch.name }}
              <ChevronDown
                v-if="ch.type === 'forum'"
                :size="11"
                class="card__forum-chevron"
                :class="{ 'card__forum-chevron--open': expandedForums.has(ch.id) }"
              />
            </span>
            <span v-if="lastMessageOf(ch.id)" class="card__last">
              <span
                class="card__author-avatar"
                :style="authorAvatarStyle(lastMessageOf(ch.id)!.authorId)"
                :title="authorLabel(lastMessageOf(ch.id)!.authorId)"
              >
                {{ authorInitials(lastMessageOf(ch.id)!.authorId) }}
              </span>
              <span class="card__snippet">{{ snippet(lastMessageOf(ch.id)!.content) }}</span>
              <span class="card__time">{{
                formatRelativeTime(lastMessageOf(ch.id)!.createdAt)
              }}</span>
            </span>
            <span v-else class="card__last card__last--empty">Aucun message</span>
          </div>
          <div v-if="statOf(ch).label" class="card__stat">
            <span class="card__stat-num">{{ formatCount(statOf(ch).num) }}</span>
            <span class="card__stat-label">{{ statOf(ch).label }}</span>
          </div>
        </button>

        <!-- Forum children, shown when expanded -->
        <template v-if="ch.type === 'forum' && expandedForums.has(ch.id)">
          <button
            v-for="child in childrenOf(ch.id)"
            :key="child.id"
            type="button"
            class="card card--child"
            :class="{ 'card--active': isActive(child) }"
            :style="cardStyle(child)"
            @click="emit('select', child, $event)"
          >
            <div class="card__icon" :style="iconBg(child)">
              <component :is="iconFor(child.type)" :size="12" stroke-width="2.4" />
            </div>
            <div class="card__text">
              <span class="card__name">{{ child.name }}</span>
              <span v-if="lastMessageOf(child.id)" class="card__last">
                <span
                  class="card__author-avatar"
                  :style="authorAvatarStyle(lastMessageOf(child.id)!.authorId)"
                  :title="authorLabel(lastMessageOf(child.id)!.authorId)"
                >
                  {{ authorInitials(lastMessageOf(child.id)!.authorId) }}
                </span>
                <span class="card__snippet">{{ snippet(lastMessageOf(child.id)!.content) }}</span>
                <span class="card__time">{{
                  formatRelativeTime(lastMessageOf(child.id)!.createdAt)
                }}</span>
              </span>
              <span v-else class="card__last card__last--empty">Aucun message</span>
            </div>
            <div v-if="statOf(child).label" class="card__stat">
              <span class="card__stat-num">{{ formatCount(statOf(child).num) }}</span>
              <span class="card__stat-label">{{ statOf(child).label }}</span>
            </div>
          </button>
          <div v-if="!childrenOf(ch.id).length" class="card--child-empty">Aucun fil</div>
        </template>
      </template>
    </div>

    <!-- Grouped by category -->
    <div v-for="g in grouped" :key="g.category.id" class="channels-list__group">
      <button
        type="button"
        class="cat-header"
        :class="{ 'cat-header--collapsed': collapsed.has(g.category.id) }"
        @click="toggleCategory(g.category.id)"
      >
        <Folder :size="12" class="cat-header__icon" />
        <span class="cat-header__name">{{ g.category.name }}</span>
        <ChevronDown :size="12" class="cat-header__chevron" />
      </button>
      <div v-if="!collapsed.has(g.category.id)" class="channels-list__cards">
        <template v-for="ch in g.channels" :key="ch.id">
          <button
            type="button"
            class="card"
            :class="{
              'card--active': isActive(ch),
              'card--forum-open': ch.type === 'forum' && expandedForums.has(ch.id),
            }"
            :style="cardStyle(ch)"
            @click="handleCardClick(ch, $event)"
          >
            <div class="card__icon" :style="iconBg(ch)">
              <component :is="iconFor(ch.type)" :size="14" stroke-width="2.4" />
            </div>
            <div class="card__text">
              <span class="card__name">
                {{ ch.name }}
                <ChevronDown
                  v-if="ch.type === 'forum'"
                  :size="11"
                  class="card__forum-chevron"
                  :class="{ 'card__forum-chevron--open': expandedForums.has(ch.id) }"
                />
              </span>
              <span v-if="lastMessageOf(ch.id)" class="card__last">
                <span
                  class="card__author-avatar"
                  :style="authorAvatarStyle(lastMessageOf(ch.id)!.authorId)"
                  :title="authorLabel(lastMessageOf(ch.id)!.authorId)"
                >
                  {{ authorInitials(lastMessageOf(ch.id)!.authorId) }}
                </span>
                <span class="card__snippet">{{ snippet(lastMessageOf(ch.id)!.content) }}</span>
                <span class="card__time">{{
                  formatRelativeTime(lastMessageOf(ch.id)!.createdAt)
                }}</span>
              </span>
              <span v-else class="card__last card__last--empty">Aucun message</span>
            </div>
            <div v-if="statOf(ch).label" class="card__stat">
              <span class="card__stat-num">{{ formatCount(statOf(ch).num) }}</span>
              <span class="card__stat-label">{{ statOf(ch).label }}</span>
            </div>
          </button>

          <!-- Forum children, shown when expanded -->
          <template v-if="ch.type === 'forum' && expandedForums.has(ch.id)">
            <button
              v-for="child in childrenOf(ch.id)"
              :key="child.id"
              type="button"
              class="card card--child"
              :class="{ 'card--active': isActive(child) }"
              :style="cardStyle(child)"
              @click="emit('select', child, $event)"
            >
              <div class="card__icon" :style="iconBg(child)">
                <component :is="iconFor(child.type)" :size="12" stroke-width="2.4" />
              </div>
              <div class="card__text">
                <span class="card__name">{{ child.name }}</span>
                <span v-if="lastMessageOf(child.id)" class="card__last">
                  <span
                    class="card__author-avatar"
                    :style="authorAvatarStyle(lastMessageOf(child.id)!.authorId)"
                    :title="authorLabel(lastMessageOf(child.id)!.authorId)"
                  >
                    {{ authorInitials(lastMessageOf(child.id)!.authorId) }}
                  </span>
                  <span class="card__snippet">{{ snippet(lastMessageOf(child.id)!.content) }}</span>
                  <span class="card__time">{{
                    formatRelativeTime(lastMessageOf(child.id)!.createdAt)
                  }}</span>
                </span>
                <span v-else class="card__last card__last--empty">Aucun message</span>
              </div>
              <div v-if="statOf(child).label" class="card__stat">
                <span class="card__stat-num">{{ formatCount(statOf(child).num) }}</span>
                <span class="card__stat-label">{{ statOf(child).label }}</span>
              </div>
            </button>
            <div v-if="!childrenOf(ch.id).length" class="card--child-empty">Aucun fil</div>
          </template>
        </template>
      </div>
    </div>

    <div v-if="!ungrouped.length && !grouped.length" class="channels-list__empty">
      Aucun salon texte
    </div>
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

/* ── Category header ── */
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

/* ── Channel card ── */
.card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 0;
  border: none;
  cursor: pointer;
  text-align: left;
  overflow: hidden;
  isolation: isolate;
}

.card--child {
  padding-left: 24px;
}
.card--child::before {
  content: '';
  position: absolute;
  left: 14px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(255, 255, 255, 0.1);
  z-index: 1;
}

.card--child-empty {
  padding: 6px 8px 6px 28px;
  font-size: 10px;
  font-style: italic;
  color: rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.02);
}

.card__name {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.card__forum-chevron {
  flex-shrink: 0;
  opacity: 0.55;
  transition: transform 160ms;
}
.card__forum-chevron--open {
  transform: rotate(0deg);
  opacity: 0.9;
}
.card__forum-chevron:not(.card__forum-chevron--open) {
  transform: rotate(-90deg);
}

.card::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    100deg,
    rgba(15, 15, 22, 0.65) 0%,
    rgba(15, 15, 22, 0.25) 50%,
    transparent 100%
  );
  z-index: 0;
}

.card > * {
  position: relative;
  z-index: 1;
}

.card__icon {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.25),
    0 2px 6px rgba(0, 0, 0, 0.25);
}

.card__text {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card__last {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.65);
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}
.card__last--empty {
  font-style: italic;
  color: rgba(255, 255, 255, 0.35);
}

.card__author-avatar {
  flex-shrink: 0;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 7px;
  font-weight: 700;
  color: white;
  letter-spacing: -0.02em;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.2),
    0 1px 2px rgba(0, 0, 0, 0.25);
}

.card__snippet {
  min-width: 0;
  color: rgba(255, 255, 255, 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card__time {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.35);
}

.card__stat {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 36px;
  line-height: 1;
}
.card__stat-num {
  font-size: 14px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.92);
  letter-spacing: -0.02em;
}
.card__stat-label {
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 2px;
}

.channels-list__empty {
  padding: 32px 12px;
  text-align: center;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
}
</style>

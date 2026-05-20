<script setup lang="ts">
import { computed, inject } from 'vue';
import type { ChannelPublic } from '@nookapp/protocol';
import { ChevronDown } from 'lucide-vue-next';
import { CHANNEL_CARD_DATA } from '~/composables/useChannelCardData';
import {
  iconForChannel,
  authorAvatarStyle,
  authorInitials,
  authorLabel,
  snippet,
  formatCount,
  formatRelativeTime,
} from '~/utils/channel-format';

const props = defineProps<{
  channel: ChannelPublic;
  active: boolean;
  isChild?: boolean;
  forumOpen?: boolean;
}>();

defineEmits<{
  click: [event: MouseEvent];
  contextmenu: [event: MouseEvent];
}>();

const data = inject(CHANNEL_CARD_DATA);
if (!data) throw new Error('ChannelCard must be used inside a provider of CHANNEL_CARD_DATA');

const lastMessage = computed(() => data.lastMessageOf(props.channel.id));
const stat = computed(() => data.statOf(props.channel));
const isForumHeader = computed(() => props.channel.type === 'forum' && !props.isChild);
</script>

<template>
  <button
    type="button"
    class="card"
    :class="{
      'card--child': isChild,
      'card--active': active,
      'card--forum-open': isForumHeader && forumOpen,
    }"
    :style="data.cardStyle(channel)"
    @click="$emit('click', $event)"
    @contextmenu="$emit('contextmenu', $event)"
  >
    <div class="card__icon" :style="data.iconBg(channel)">
      <component :is="iconForChannel(channel.type)" :size="isChild ? 12 : 14" stroke-width="2.4" />
    </div>
    <div class="card__text">
      <span class="card__name">
        {{ channel.name }}
        <ChevronDown
          v-if="isForumHeader"
          :size="11"
          class="card__forum-chevron"
          :class="{ 'card__forum-chevron--open': forumOpen }"
        />
      </span>
      <span v-if="lastMessage" class="card__last">
        <span
          class="card__author-avatar"
          :style="authorAvatarStyle(lastMessage.authorId)"
          :title="authorLabel(lastMessage.authorId)"
        >
          {{ authorInitials(lastMessage.authorId) }}
        </span>
        <span class="card__snippet">{{ snippet(lastMessage.content) }}</span>
        <span class="card__time">{{ formatRelativeTime(lastMessage.createdAt) }}</span>
      </span>
      <span v-else class="card__last card__last--empty">Aucun message</span>
    </div>
    <div v-if="channel.showStat && stat.label" class="card__stat">
      <span class="card__stat-num">{{ formatCount(stat.num) }}</span>
      <span class="card__stat-label">{{ stat.label }}</span>
    </div>
  </button>
</template>

<style scoped>
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
</style>

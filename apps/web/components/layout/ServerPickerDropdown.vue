<script setup lang="ts">
import { Home, Mail, Puzzle, Settings, Check } from 'lucide-vue-next';
import type { ServerPublic } from '@nookapp/protocol';

defineProps<{
  mode: 'switcher' | 'menu' | null;
  servers: ServerPublic[];
  currentServerId: string;
  currentServerName?: string | null;
  top: number;
  left: number;
  isAdmin: boolean;
}>();

defineEmits<{
  close: [];
  'switch-server': [id: string];
  invite: [];
  'open-settings': [];
}>();

const { t } = useI18n();
</script>

<template>
  <Teleport to="body">
    <div v-if="mode" class="picker-veil" @click="$emit('close')" />

    <div v-if="mode === 'switcher'" class="picker" :style="{ top: top + 'px', left: left + 'px' }">
      <p class="picker__hint">{{ t('serverPicker.switchNook') }}</p>
      <div class="picker__list">
        <button
          v-for="s in servers"
          :key="s.id"
          class="picker__row"
          :class="{ 'picker__row--active': s.id === currentServerId }"
          @click="s.id === currentServerId ? $emit('close') : $emit('switch-server', s.id)"
        >
          <span class="picker__avatar">{{ s.name[0]?.toUpperCase() }}</span>
          <span class="picker__label">{{ s.name }}</span>
          <Check
            v-if="s.id === currentServerId"
            :size="13"
            :stroke-width="2.4"
            class="picker__check"
          />
        </button>
      </div>

      <div class="picker__sep" />

      <NuxtLink to="/app" class="picker__row picker__row--ghost" @click="$emit('close')">
        <span class="picker__icon picker__icon--ghost"><Home :size="13" :stroke-width="2" /></span>
        <span class="picker__label picker__label--muted">{{ t('serverPicker.appHome') }}</span>
      </NuxtLink>
    </div>

    <div v-else-if="mode === 'menu'" class="picker" :style="{ top: top + 'px', left: left + 'px' }">
      <p class="picker__hint picker__hint--truncate">{{ currentServerName }}</p>

      <button
        class="picker__row"
        @click="
          $emit('close');
          $emit('invite');
        "
      >
        <span class="picker__icon"><Mail :size="13" :stroke-width="2" /></span>
        <span class="picker__label">{{ t('serverPicker.invite') }}</span>
      </button>

      <NuxtLink
        :to="`/app/${currentServerId}/plugins`"
        class="picker__row picker__row--ghost"
        @click="$emit('close')"
      >
        <span class="picker__icon"><Puzzle :size="13" :stroke-width="2" /></span>
        <span class="picker__label">{{ t('serverPicker.plugins') }}</span>
      </NuxtLink>

      <button
        v-if="isAdmin"
        class="picker__row"
        @click="
          $emit('close');
          $emit('open-settings');
        "
      >
        <span class="picker__icon"><Settings :size="13" :stroke-width="2" /></span>
        <span class="picker__label">{{ t('serverPicker.settings') }}</span>
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.picker-veil {
  position: fixed;
  inset: 0;
  z-index: 55;
}

.picker {
  position: fixed;
  z-index: 56;
  display: flex;
  flex-direction: column;
  min-width: 220px;
  padding: 6px;
  border-radius: 12px;
  background: rgba(20, 20, 28, 0.92);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow:
    0 12px 36px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.picker__hint {
  margin: 0;
  padding: 6px 8px 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.4);
}

.picker__hint--truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.picker__list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.picker__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  color: rgba(255, 255, 255, 0.75);
  font-size: 12px;
  font-weight: 500;
  transition:
    background 120ms,
    color 120ms;
}

.picker__row:hover {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.95);
}

.picker__row--active {
  background: rgba(255, 255, 255, 0.05);
}

.picker__row--ghost .picker__icon {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.45);
}

.picker__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, #6366f1, #4338ca);
  color: white;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.picker__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.55);
  flex-shrink: 0;
}

.picker__label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.picker__label--muted {
  color: rgba(255, 255, 255, 0.4);
}

.picker__check {
  color: rgba(255, 255, 255, 0.55);
}

.picker__sep {
  height: 1px;
  margin: 4px 8px;
  background: rgba(255, 255, 255, 0.06);
}
</style>

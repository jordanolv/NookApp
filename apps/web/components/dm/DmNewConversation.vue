<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { Search } from 'lucide-vue-next';
import type { DmUser } from '@nookapp/protocol';
import { useDms } from '~/composables/useDms';

const emit = defineEmits<{ started: [conversationId: string] }>();

const { store, fetchCandidates, lookupUser, openConversation } = useDms();

const query = ref('');
const busyId = ref<string | null>(null);
const remote = ref<DmUser | null>(null);
let lookupTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(() => {
  void fetchCandidates();
});
onUnmounted(() => {
  if (lookupTimer) clearTimeout(lookupTimer);
});

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase().replace(/^@/, '');
  if (!q) return store.candidates;
  return store.candidates.filter(
    (c) => c.name.toLowerCase().includes(q) || c.username.toLowerCase().includes(q),
  );
});

watch(query, (q) => {
  remote.value = null;
  if (lookupTimer) clearTimeout(lookupTimer);
  const handle = q.trim().replace(/^@/, '');
  if (handle.length < 2) return;
  lookupTimer = setTimeout(async () => {
    const found = await lookupUser(handle);
    if (found && !store.candidates.some((c) => c.id === found.id)) remote.value = found;
  }, 300);
});

async function start(userId: string) {
  if (busyId.value) return;
  busyId.value = userId;
  try {
    const conv = await openConversation(userId);
    emit('started', conv.id);
  } finally {
    busyId.value = null;
  }
}
</script>

<template>
  <div class="dm-new">
    <div class="dm-new__search">
      <Search :size="15" class="dm-new__search-icon" />
      <input v-model="query" type="text" placeholder="Nom ou @handle…" autofocus />
    </div>
    <div class="dm-new__list">
      <button
        v-for="c in filtered"
        :key="c.id"
        type="button"
        class="dm-new__item"
        :disabled="busyId === c.id"
        @click="start(c.id)"
      >
        <DmAvatar :name="c.name" :avatar-url="c.avatarUrl" :size="34" />
        <span class="dm-new__who">
          <span class="dm-new__name">{{ c.name }}</span>
          <span class="dm-new__handle">@{{ c.username }}</span>
        </span>
      </button>

      <template v-if="remote">
        <div class="dm-new__section">Ailleurs sur Nookapp</div>
        <button
          type="button"
          class="dm-new__item"
          :disabled="busyId === remote.id"
          @click="start(remote.id)"
        >
          <DmAvatar :name="remote.name" :avatar-url="remote.avatarUrl" :size="34" />
          <span class="dm-new__who">
            <span class="dm-new__name">{{ remote.name }}</span>
            <span class="dm-new__handle">@{{ remote.username }}</span>
          </span>
        </button>
      </template>

      <div v-if="filtered.length === 0 && !remote" class="dm-new__empty">
        Cherche quelqu'un par son @handle pour lui écrire.
      </div>
    </div>
  </div>
</template>

<style scoped>
.dm-new {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 12px;
  gap: 10px;
}
.dm-new__search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border-radius: 10px;
  background: var(--surface-tinted);
  border: 1px solid var(--surface-border);
}
.dm-new__search-icon {
  color: var(--ink-muted);
  flex-shrink: 0;
}
.dm-new__search input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  padding: 9px 0;
  font-size: 13px;
  color: var(--ink);
}
.dm-new__list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  scrollbar-width: thin;
  scrollbar-color: var(--surface-divider) transparent;
}
.dm-new__empty {
  padding: 16px 8px;
  text-align: center;
  font-size: 12px;
  color: var(--ink-faint);
}
.dm-new__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  text-align: left;
  border: none;
  padding: 8px;
  border-radius: 10px;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  transition: background 0.15s ease;
}
.dm-new__item:hover {
  background: var(--surface-tinted);
}
.dm-new__item:disabled {
  opacity: 0.5;
  cursor: default;
}
.dm-new__who {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.dm-new__name {
  font-weight: 600;
  font-size: 13px;
}
.dm-new__handle {
  font-size: 11px;
  color: var(--ink-faint);
}
.dm-new__section {
  padding: 10px 8px 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-faint);
}
</style>

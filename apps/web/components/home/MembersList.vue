<script setup lang="ts">
import { Search, LayoutGrid, List } from 'lucide-vue-next';
import type { MemberPublic, RolePublic } from '@nookapp/protocol';
import { useRoles } from '~/composables/useRoles';

const props = defineProps<{
  serverId: string;
}>();

const api = useApi();
const rolesApi = useRoles();

const members = ref<MemberPublic[]>([]);
const roles = ref<RolePublic[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const query = ref('');
const viewMode = useState<'list' | 'grid'>('home.members.viewMode', () => 'list');

const rolesById = computed(() => {
  const m = new Map<string, RolePublic>();
  for (const r of roles.value) m.set(r.id, r);
  return m;
});

const filteredMembers = computed(() => {
  const q = query.value.trim().toLowerCase();
  const list = q
    ? members.value.filter((m) => m.user.name.toLowerCase().includes(q))
    : members.value;
  return [...list].sort((a, b) => {
    if (a.isOwner && !b.isOwner) return -1;
    if (!a.isOwner && b.isOwner) return 1;
    return a.user.name.localeCompare(b.user.name);
  });
});

async function refresh() {
  loading.value = true;
  error.value = null;
  try {
    const [m, r] = await Promise.all([
      api.get<MemberPublic[]>(`/servers/${props.serverId}/members`),
      rolesApi.listRoles(props.serverId),
    ]);
    members.value = m;
    roles.value = r;
  } catch (e) {
    error.value = (e as Error).message ?? 'Erreur de chargement';
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.serverId,
  () => {
    void refresh();
  },
  { immediate: true },
);
</script>

<template>
  <div class="home-members">
    <div class="home-members__toolbar">
      <label class="home-members__search">
        <Search :size="13" class="home-members__search-icon" />
        <input
          v-model="query"
          type="search"
          placeholder="Rechercher…"
          class="home-members__search-input"
        />
      </label>
      <div class="home-members__view-toggle" role="tablist">
        <button
          type="button"
          class="home-members__view-btn"
          :class="{ 'home-members__view-btn--active': viewMode === 'list' }"
          :title="'Liste'"
          @click="viewMode = 'list'"
        >
          <List :size="13" />
        </button>
        <button
          type="button"
          class="home-members__view-btn"
          :class="{ 'home-members__view-btn--active': viewMode === 'grid' }"
          :title="'Avatars'"
          @click="viewMode = 'grid'"
        >
          <LayoutGrid :size="13" />
        </button>
      </div>
    </div>

    <div v-if="loading && !members.length" class="home-members__empty">Chargement…</div>
    <div v-else-if="error" class="home-members__error">{{ error }}</div>
    <div v-else-if="!filteredMembers.length" class="home-members__empty">Aucun résultat</div>

    <ul v-else-if="viewMode === 'list'" class="home-members__list">
      <li v-for="m in filteredMembers" :key="m.id" class="home-member">
        <img
          v-if="m.user.avatarUrl"
          :src="m.user.avatarUrl"
          :alt="m.user.name"
          class="home-member__avatar"
        />
        <div v-else class="home-member__avatar home-member__avatar--placeholder">
          {{ m.user.name.slice(0, 1).toUpperCase() }}
        </div>
        <div class="home-member__copy">
          <div class="home-member__name-row">
            <span class="home-member__name">{{ m.user.name }}</span>
            <span v-if="m.isOwner" class="home-member__badge">owner</span>
          </div>
          <div v-if="m.roleIds.length" class="home-member__roles">
            <span
              v-for="rid in m.roleIds"
              :key="rid"
              class="home-member__role"
              :title="rolesById.get(rid)?.name ?? '?'"
            >
              <span
                class="home-member__role-dot"
                :style="{ background: rolesById.get(rid)?.color ?? '#99aab5' }"
              />
              {{ rolesById.get(rid)?.name ?? '?' }}
            </span>
          </div>
        </div>
      </li>
    </ul>

    <ul v-else class="home-members__grid">
      <li
        v-for="m in filteredMembers"
        :key="m.id"
        class="home-member-tile"
        :title="m.isOwner ? `${m.user.name} (owner)` : m.user.name"
      >
        <img
          v-if="m.user.avatarUrl"
          :src="m.user.avatarUrl"
          :alt="m.user.name"
          class="home-member-tile__avatar"
        />
        <div v-else class="home-member-tile__avatar home-member-tile__avatar--placeholder">
          {{ m.user.name.slice(0, 1).toUpperCase() }}
        </div>
        <span v-if="m.isOwner" class="home-member-tile__crown" aria-hidden="true">★</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.home-members {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.home-members__toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 8px 6px;
  flex-shrink: 0;
}
.home-members__search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  border-radius: 10px;
  background: var(--surface-tinted);
  border: 1px solid var(--surface-border);
  transition: border-color 120ms;
}
.home-members__search:focus-within {
  border-color: var(--ink-muted);
}
.home-members__search-icon {
  color: var(--ink-muted);
  flex-shrink: 0;
}
.home-members__search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 12px;
  color: var(--ink);
  min-width: 0;
}
.home-members__search-input::placeholder {
  color: var(--ink-faint);
}
.home-members__view-toggle {
  display: inline-flex;
  padding: 2px;
  background: var(--surface-tinted);
  border: 1px solid var(--surface-border);
  border-radius: 8px;
  flex-shrink: 0;
}
.home-members__view-btn {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  background: transparent;
  border: none;
  border-radius: 5px;
  color: var(--ink-muted);
  cursor: pointer;
  transition:
    background 120ms,
    color 120ms;
}
.home-members__view-btn:hover {
  color: var(--ink);
}
.home-members__view-btn--active {
  background: var(--ink);
  color: var(--ink-inverse);
}

.home-members__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 6px;
  padding: 4px 8px 8px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  list-style: none;
  margin: 0;
}
.home-member-tile {
  position: relative;
  aspect-ratio: 1;
}
.home-member-tile__avatar {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  object-fit: cover;
  background: var(--surface-tinted);
  border: 1px solid var(--surface-border);
}
.home-member-tile__avatar--placeholder {
  display: grid;
  place-items: center;
  color: var(--ink-soft);
  font-size: 14px;
  font-weight: 700;
}
.home-member-tile__crown {
  position: absolute;
  top: -3px;
  right: -3px;
  width: 16px;
  height: 16px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--accent-warm);
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  border: 2px solid var(--surface-strong);
}

.home-members__empty,
.home-members__error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 24px 12px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
}
.home-members__empty {
  color: var(--ink-faint);
}
.home-members__error {
  color: rgb(248, 113, 113);
}

.home-members__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 6px 8px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  list-style: none;
  margin: 0;
}

.home-member {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 9px;
  border-radius: 9px;
  background: var(--surface-tinted);
  border: 1px solid transparent;
  transition:
    background 140ms,
    border-color 140ms;
}

.home-member:hover {
  background: var(--surface-tinted);
  border-color: var(--surface-border);
}

.home-member__avatar {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
}
.home-member__avatar--placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-border);
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 700;
}

.home-member__copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  flex: 1;
}

.home-member__name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.home-member__name {
  color: var(--ink);
  font-size: 12px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-member__badge {
  flex-shrink: 0;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(232, 163, 90, 0.22);
  color: var(--accent-warm);
  font-size: 9px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.home-member__roles {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.home-member__role {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--surface-tinted);
  color: var(--ink-soft);
  font-size: 10px;
  font-weight: 650;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.home-member__role-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>

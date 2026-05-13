<script setup lang="ts">
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

const rolesById = computed(() => {
  const m = new Map<string, RolePublic>();
  for (const r of roles.value) m.set(r.id, r);
  return m;
});

const sortedMembers = computed(() =>
  [...members.value].sort((a, b) => {
    if (a.isOwner && !b.isOwner) return -1;
    if (!a.isOwner && b.isOwner) return 1;
    return a.user.name.localeCompare(b.user.name);
  }),
);

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
    <div v-if="loading && !members.length" class="home-members__empty">Chargement…</div>
    <div v-else-if="error" class="home-members__error">{{ error }}</div>
    <ul v-else class="home-members__list">
      <li v-for="m in sortedMembers" :key="m.id" class="home-member">
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
  </div>
</template>

<style scoped>
.home-members {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
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
  color: rgba(255, 255, 255, 0.32);
}
.home-members__error {
  color: rgb(248, 113, 113);
}

.home-members__list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 5px;
}

.home-member {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 7px 9px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid transparent;
  transition:
    background 140ms,
    border-color 140ms;
}

.home-member:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.07);
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
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
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
  color: rgba(255, 255, 255, 0.88);
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
  background: rgba(245, 158, 11, 0.18);
  color: rgb(252, 211, 77);
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
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.78);
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

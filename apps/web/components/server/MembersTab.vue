<script setup lang="ts">
import type { MemberPublic, RolePublic } from '@nookapp/protocol';
import { useRoles } from '~/composables/useRoles';

const props = defineProps<{ serverId: string }>();

const api = useApi();
const rolesApi = useRoles();

const members = ref<MemberPublic[]>([]);
const roles = ref<RolePublic[]>([]);
const loading = ref(false);
const savingMemberId = ref<string | null>(null);
const error = ref<string | null>(null);

const assignableRoles = computed(() => roles.value.filter((r) => !r.isEveryone));

const rolesById = computed(() => {
  const m = new Map<string, RolePublic>();
  for (const r of roles.value) m.set(r.id, r);
  return m;
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

async function toggleRole(member: MemberPublic, roleId: string) {
  if (member.isOwner) return;
  const has = member.roleIds.includes(roleId);
  const next = has ? member.roleIds.filter((id) => id !== roleId) : [...member.roleIds, roleId];
  savingMemberId.value = member.id;
  error.value = null;
  try {
    const updated = await rolesApi.setMemberRoles(props.serverId, member.userId, {
      roleIds: next,
    });
    members.value = members.value.map((m) => (m.id === member.id ? { ...m, roleIds: updated } : m));
  } catch (e) {
    error.value = (e as Error).message ?? 'Impossible de modifier les rôles';
  } finally {
    savingMemberId.value = null;
  }
}

onMounted(refresh);
</script>

<template>
  <div class="h-full overflow-y-auto p-5">
    <div v-if="loading" class="text-xs text-white/50">Chargement…</div>
    <div v-else>
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-medium text-white">Membres · {{ members.length }}</h3>
        <button class="text-xs text-white/60 hover:text-white" :disabled="loading" @click="refresh">
          Actualiser
        </button>
      </div>

      <div v-if="error" class="mb-3 text-xs text-red-400">{{ error }}</div>

      <ul class="space-y-2">
        <li
          v-for="m in members"
          :key="m.id"
          class="flex items-start gap-3 p-3 rounded border border-white/10"
          style="background: rgba(0, 0, 0, 0.15)"
        >
          <img
            v-if="m.user.avatarUrl"
            :src="m.user.avatarUrl"
            :alt="m.user.name"
            class="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
          <div
            v-else
            class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium"
            style="background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.7)"
          >
            {{ m.user.name.slice(0, 1).toUpperCase() }}
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1.5">
              <span class="text-sm text-white truncate">{{ m.user.name }}</span>
              <span
                v-if="m.isOwner"
                class="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300"
              >
                Owner
              </span>
            </div>

            <!-- Current role badges -->
            <div v-if="m.roleIds.length" class="flex flex-wrap gap-1.5 mb-2">
              <span
                v-for="rid in m.roleIds"
                :key="rid"
                class="text-[11px] px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                style="background: rgba(255, 255, 255, 0.08)"
              >
                <span
                  class="w-2 h-2 rounded-full"
                  :style="{ background: rolesById.get(rid)?.color ?? '#99aab5' }"
                />
                <span class="text-white/85">{{ rolesById.get(rid)?.name ?? '?' }}</span>
              </span>
            </div>

            <!-- Role assignment toggles -->
            <details v-if="!m.isOwner && assignableRoles.length" class="group">
              <summary
                class="text-xs text-white/50 hover:text-white cursor-pointer select-none list-none"
              >
                <span class="group-open:hidden">Assigner des rôles ▾</span>
                <span class="hidden group-open:inline">Masquer ▴</span>
              </summary>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <button
                  v-for="r in assignableRoles"
                  :key="r.id"
                  class="text-[11px] px-2 py-0.5 rounded border transition-colors disabled:opacity-50"
                  :class="
                    m.roleIds.includes(r.id)
                      ? 'border-white/30 bg-white/10 text-white'
                      : 'border-white/10 text-white/60 hover:bg-white/5'
                  "
                  :disabled="savingMemberId === m.id"
                  @click="toggleRole(m, r.id)"
                >
                  <span
                    class="inline-block w-2 h-2 rounded-full mr-1 align-middle"
                    :style="{ background: r.color ?? '#99aab5' }"
                  />
                  {{ r.name }}
                </button>
              </div>
            </details>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

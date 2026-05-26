<script setup lang="ts">
import type { MemberPublic, RolePublic } from '@nookapp/protocol';
import { useRoles } from '~/composables/useRoles';

const props = defineProps<{ serverId: string }>();

const api = useApi();
const rolesApi = useRoles();
const { t } = useI18n();

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
    error.value = (e as Error).message ?? t('serverSettings.members.loadError');
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
    error.value = (e as Error).message ?? t('serverSettings.members.roleUpdateError');
  } finally {
    savingMemberId.value = null;
  }
}

onMounted(refresh);
</script>

<template>
  <div class="h-full overflow-y-auto p-5">
    <div v-if="loading" class="text-xs text-ink-muted">
      {{ t('serverSettings.members.loading') }}
    </div>
    <div v-else>
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-medium text-ink">
          {{ t('serverSettings.members.title', { count: members.length }) }}
        </h3>
        <button class="text-xs text-ink-soft hover:text-ink" :disabled="loading" @click="refresh">
          {{ t('serverSettings.members.refresh') }}
        </button>
      </div>

      <div v-if="error" class="mb-3 text-xs text-red-400">{{ error }}</div>

      <ul class="space-y-2">
        <li
          v-for="m in members"
          :key="m.id"
          class="flex items-start gap-3 p-3 rounded border border-surface-border"
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
            style="background: var(--surface-border); color: var(--ink-soft)"
          >
            {{ m.user.name.slice(0, 1).toUpperCase() }}
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1.5">
              <span class="text-sm text-ink truncate">{{ m.user.name }}</span>
              <span
                v-if="m.isOwner"
                class="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300"
              >
                {{ t('serverSettings.members.owner') }}
              </span>
            </div>

            <!-- Current role badges -->
            <div v-if="m.roleIds.length" class="flex flex-wrap gap-1.5 mb-2">
              <span
                v-for="rid in m.roleIds"
                :key="rid"
                class="text-[11px] px-1.5 py-0.5 rounded inline-flex items-center gap-1"
                style="background: var(--surface-border)"
              >
                <span
                  class="w-2 h-2 rounded-full"
                  :style="{ background: rolesById.get(rid)?.color ?? '#99aab5' }"
                />
                <span class="text-ink">{{ rolesById.get(rid)?.name ?? '?' }}</span>
              </span>
            </div>

            <!-- Role assignment toggles -->
            <details v-if="!m.isOwner && assignableRoles.length" class="group">
              <summary
                class="text-xs text-ink-muted hover:text-ink cursor-pointer select-none list-none"
              >
                <span class="group-open:hidden">{{ t('serverSettings.members.assignRoles') }}</span>
                <span class="hidden group-open:inline">{{
                  t('serverSettings.members.hideRoles')
                }}</span>
              </summary>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <button
                  v-for="r in assignableRoles"
                  :key="r.id"
                  class="text-[11px] px-2 py-0.5 rounded border transition-colors disabled:opacity-50"
                  :class="
                    m.roleIds.includes(r.id)
                      ? 'border-surface-border bg-surface-tinted text-ink'
                      : 'border-surface-border text-ink-soft hover:bg-surface-tinted'
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

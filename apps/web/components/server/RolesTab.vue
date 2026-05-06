<script setup lang="ts">
import {
  hasPermission,
  PERMISSION_KEYS,
  PERMISSION_META,
  PERMISSIONS,
  type PermissionKey,
  type RolePublic,
} from '@nookapp/protocol';
import { useRoles } from '~/composables/useRoles';

const props = defineProps<{ serverId: string }>();

const rolesApi = useRoles();
const roles = ref<RolePublic[]>([]);
const selectedId = ref<string | null>(null);
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);

const draft = ref<{ name: string; color: string | null; permissions: number } | null>(null);

const selected = computed(() => roles.value.find((r) => r.id === selectedId.value) ?? null);
const dirty = computed(() => {
  if (!selected.value || !draft.value) return false;
  return (
    draft.value.name !== selected.value.name ||
    (draft.value.color ?? null) !== (selected.value.color ?? null) ||
    draft.value.permissions !== selected.value.permissions
  );
});

const groupedPermissions: Record<string, PermissionKey[]> = {
  general: [],
  moderation: [],
  management: [],
};
for (const key of PERMISSION_KEYS) groupedPermissions[PERMISSION_META[key].category].push(key);

const groupLabels: Record<string, string> = {
  general: 'Général',
  moderation: 'Modération',
  management: 'Gestion',
};

async function refresh() {
  loading.value = true;
  error.value = null;
  try {
    roles.value = await rolesApi.listRoles(props.serverId);
    if (!selectedId.value && roles.value.length) selectedId.value = roles.value[0].id;
    syncDraft();
  } catch (e) {
    error.value = (e as Error).message ?? 'Erreur de chargement';
  } finally {
    loading.value = false;
  }
}

function syncDraft() {
  if (!selected.value) {
    draft.value = null;
    return;
  }
  draft.value = {
    name: selected.value.name,
    color: selected.value.color,
    permissions: selected.value.permissions,
  };
}

watch(selectedId, syncDraft);

async function onCreate() {
  saving.value = true;
  error.value = null;
  try {
    const created = await rolesApi.createRole(props.serverId, {
      name: 'Nouveau rôle',
      color: null,
      permissions: 0,
    });
    roles.value = [created, ...roles.value];
    selectedId.value = created.id;
  } catch (e) {
    error.value = (e as Error).message ?? 'Impossible de créer le rôle';
  } finally {
    saving.value = false;
  }
}

async function onSave() {
  if (!selected.value || !draft.value || !dirty.value) return;
  saving.value = true;
  error.value = null;
  try {
    const updated = await rolesApi.updateRole(props.serverId, selected.value.id, {
      name: draft.value.name,
      color: draft.value.color,
      permissions: draft.value.permissions,
    });
    roles.value = roles.value.map((r) => (r.id === updated.id ? updated : r));
    syncDraft();
  } catch (e) {
    error.value = (e as Error).message ?? "Impossible d'enregistrer";
  } finally {
    saving.value = false;
  }
}

async function onDelete() {
  if (!selected.value || selected.value.isEveryone) return;
  if (!confirm(`Supprimer le rôle "${selected.value.name}" ?`)) return;
  saving.value = true;
  error.value = null;
  try {
    await rolesApi.deleteRole(props.serverId, selected.value.id);
    roles.value = roles.value.filter((r) => r.id !== selected.value!.id);
    selectedId.value = roles.value[0]?.id ?? null;
  } catch (e) {
    error.value = (e as Error).message ?? 'Suppression impossible';
  } finally {
    saving.value = false;
  }
}

function togglePermission(flag: number) {
  if (!draft.value) return;
  if (hasPermission(draft.value.permissions, flag)) {
    draft.value.permissions &= ~flag;
  } else {
    draft.value.permissions |= flag;
  }
}

function isOn(flag: number): boolean {
  return draft.value ? hasPermission(draft.value.permissions, flag) : false;
}

onMounted(refresh);
</script>

<template>
  <div class="flex h-full">
    <!-- Roles list -->
    <div
      class="w-60 flex-shrink-0 border-r border-white/10 flex flex-col"
      style="background: rgba(0, 0, 0, 0.15)"
    >
      <div
        class="px-3 py-2 text-[10px] uppercase tracking-wider"
        style="color: rgba(255, 255, 255, 0.5)"
      >
        Rôles · {{ roles.length }}
      </div>
      <div class="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        <button
          v-for="r in roles"
          :key="r.id"
          class="w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 transition-colors"
          :class="
            selectedId === r.id
              ? 'bg-white/15 text-white'
              : 'text-white/70 hover:bg-white/5 hover:text-white'
          "
          @click="selectedId = r.id"
        >
          <span
            class="w-3 h-3 rounded-full flex-shrink-0 border border-white/20"
            :style="{ background: r.color ?? '#99aab5' }"
          />
          <span class="truncate">{{ r.name }}</span>
        </button>
      </div>
      <div class="p-2 border-t border-white/10">
        <button
          class="w-full px-3 py-1.5 rounded text-xs font-medium bg-white/10 hover:bg-white/15 text-white disabled:opacity-50"
          :disabled="saving"
          @click="onCreate"
        >
          + Nouveau rôle
        </button>
      </div>
    </div>

    <!-- Editor -->
    <div class="flex-1 overflow-y-auto p-5">
      <div v-if="loading" class="text-xs text-white/50">Chargement…</div>
      <div v-else-if="!selected" class="text-xs text-white/50">Aucun rôle.</div>
      <div v-else-if="draft" class="space-y-5 max-w-2xl">
        <div>
          <label class="block text-[10px] uppercase tracking-wider mb-1.5 text-white/50">
            Nom du rôle
          </label>
          <input
            v-model="draft.name"
            type="text"
            class="w-full px-3 py-2 rounded bg-black/30 border border-white/10 text-sm text-white focus:outline-none focus:border-white/30 disabled:opacity-50"
            :disabled="selected.isEveryone"
            maxlength="60"
          />
        </div>

        <div>
          <label class="block text-[10px] uppercase tracking-wider mb-1.5 text-white/50">
            Couleur
          </label>
          <div class="flex items-center gap-2">
            <input
              :value="draft.color ?? '#99aab5'"
              type="color"
              class="w-10 h-10 rounded cursor-pointer bg-transparent border border-white/10"
              @input="(e) => draft && (draft.color = (e.target as HTMLInputElement).value)"
            />
            <button
              class="text-xs text-white/60 hover:text-white"
              :disabled="!draft.color"
              @click="draft && (draft.color = null)"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        <div>
          <div class="text-[10px] uppercase tracking-wider mb-2 text-white/50">Permissions</div>
          <div class="space-y-4">
            <div v-for="(keys, group) in groupedPermissions" :key="group">
              <div class="text-xs font-medium mb-1.5 text-white/80">{{ groupLabels[group] }}</div>
              <div class="space-y-1">
                <label
                  v-for="key in keys"
                  :key="key"
                  class="flex items-start gap-3 p-2 rounded hover:bg-white/5 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    class="mt-0.5"
                    :checked="isOn(PERMISSIONS[key])"
                    @change="togglePermission(PERMISSIONS[key])"
                  />
                  <div class="flex-1">
                    <div class="text-sm text-white">{{ PERMISSION_META[key].label }}</div>
                    <div class="text-xs text-white/50">{{ PERMISSION_META[key].description }}</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div v-if="error" class="text-xs text-red-400">{{ error }}</div>

        <div class="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            v-if="!selected.isEveryone"
            class="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
            :disabled="saving"
            @click="onDelete"
          >
            Supprimer le rôle
          </button>
          <span v-else />
          <div class="flex items-center gap-2">
            <button
              class="px-3 py-1.5 rounded text-xs text-white/70 hover:text-white disabled:opacity-50"
              :disabled="!dirty || saving"
              @click="syncDraft"
            >
              Annuler
            </button>
            <button
              class="px-4 py-1.5 rounded text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
              :disabled="!dirty || saving"
              @click="onSave"
            >
              {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

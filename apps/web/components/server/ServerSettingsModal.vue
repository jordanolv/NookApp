<script setup lang="ts">
const props = defineProps<{ serverId: string; serverName?: string | null }>();
const emit = defineEmits<{ close: [] }>();

type TabKey = 'general' | 'roles' | 'members';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'general', label: 'Général' },
  { key: 'roles', label: 'Rôles' },
  { key: 'members', label: 'Membres' },
];

const activeTab = ref<TabKey>('roles');
</script>

<template>
  <UiFloatingWindow
    :title="`Paramètres du serveur${props.serverName ? ` — ${props.serverName}` : ''}`"
    :initial-width="860"
    :initial-height="600"
    :min-width="640"
    :min-height="420"
    @close="emit('close')"
  >
    <div class="h-full flex">
      <!-- Tabs sidebar -->
      <nav
        class="w-44 flex-shrink-0 border-r border-white/10 p-2 space-y-0.5"
        style="background: rgba(0, 0, 0, 0.2)"
      >
        <button
          v-for="t in tabs"
          :key="t.key"
          class="w-full text-left px-3 py-1.5 rounded text-sm transition-colors"
          :class="
            activeTab === t.key
              ? 'bg-white/15 text-white'
              : 'text-white/60 hover:bg-white/5 hover:text-white'
          "
          @click="activeTab = t.key"
        >
          {{ t.label }}
        </button>
      </nav>

      <!-- Tab content -->
      <div class="flex-1 min-w-0">
        <ServerRolesTab v-if="activeTab === 'roles'" :server-id="props.serverId" />
        <ServerMembersTab v-else-if="activeTab === 'members'" :server-id="props.serverId" />
        <div
          v-else-if="activeTab === 'general'"
          class="h-full flex items-center justify-center p-8 text-center text-xs"
          style="color: rgba(255, 255, 255, 0.4)"
        >
          (Bientôt) — nom, bannière, suppression…
        </div>
      </div>
    </div>
  </UiFloatingWindow>
</template>

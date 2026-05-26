<script setup lang="ts">
const props = defineProps<{ serverId: string; serverName?: string | null }>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();

type TabKey = 'general' | 'roles' | 'members';

const tabs: Array<{ key: TabKey; labelKey: string }> = [
  { key: 'general', labelKey: 'serverSettings.tabs.general' },
  { key: 'roles', labelKey: 'serverSettings.tabs.roles' },
  { key: 'members', labelKey: 'serverSettings.tabs.members' },
];

const activeTab = ref<TabKey>('roles');
</script>

<template>
  <UiFloatingWindow
    :title="
      props.serverName
        ? t('serverSettings.titleWithName', { name: props.serverName })
        : t('serverSettings.title')
    "
    :initial-width="860"
    :initial-height="600"
    :min-width="640"
    :min-height="420"
    @close="emit('close')"
  >
    <div class="h-full flex">
      <!-- Tabs sidebar -->
      <nav
        class="w-44 flex-shrink-0 border-r border-surface-border p-2 space-y-0.5"
        style="background: rgba(0, 0, 0, 0.2)"
      >
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="w-full text-left px-3 py-1.5 rounded text-sm transition-colors"
          :class="
            activeTab === tab.key
              ? 'bg-surface-tinted text-ink'
              : 'text-ink-soft hover:bg-surface-tinted hover:text-ink'
          "
          @click="activeTab = tab.key"
        >
          {{ t(tab.labelKey) }}
        </button>
      </nav>

      <!-- Tab content -->
      <div class="flex-1 min-w-0">
        <ServerRolesTab v-if="activeTab === 'roles'" :server-id="props.serverId" />
        <ServerMembersTab v-else-if="activeTab === 'members'" :server-id="props.serverId" />
        <div
          v-else-if="activeTab === 'general'"
          class="h-full flex items-center justify-center p-8 text-center text-xs"
          style="color: var(--ink-muted)"
        >
          {{ t('serverSettings.generalSoon') }}
        </div>
      </div>
    </div>
  </UiFloatingWindow>
</template>

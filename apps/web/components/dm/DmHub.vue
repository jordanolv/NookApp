<script setup lang="ts">
import { computed, watch } from 'vue';
import { PenSquare } from 'lucide-vue-next';
import { useDms } from '~/composables/useDms';
import { useDmHub } from '~/composables/useDmHub';

const hub = useDmHub();
const { store, markRead } = useDms();
const { user } = useAuth();

const conversations = computed(() => store.sortedConversations);
const active = computed(() => store.conversations.find((c) => c.id === hub.activeId.value) ?? null);

watch(
  () => [hub.open.value, hub.activeId.value, active.value?.unreadCount] as const,
  () => {
    if (hub.open.value && active.value && active.value.unreadCount > 0) {
      void markRead(active.value.id);
    }
  },
);

function onStarted(id: string) {
  hub.openConversation(id);
}
</script>

<template>
  <UiFloatingWindow
    v-if="hub.open.value"
    title="Messages privés"
    :initial-width="760"
    :initial-height="540"
    :min-width="560"
    :min-height="380"
    :z-index="85"
    persist-key="dm:hub"
    @close="hub.close()"
  >
    <div class="dm-hub">
      <aside class="dm-hub__rail">
        <button type="button" class="dm-hub__new" @click="hub.startComposing()">
          <PenSquare :size="15" />
          <span>Nouveau message</span>
        </button>
        <DmConversationList
          :conversations="conversations"
          :active-id="hub.composing.value ? null : hub.activeId.value"
          @select="hub.openConversation"
        />
      </aside>
      <section class="dm-hub__main">
        <DmNewConversation v-if="hub.composing.value" @started="onStarted" />
        <DmThread v-else-if="active" :conversation="active" :me="user?.id ?? ''" />
        <div v-else class="dm-hub__placeholder">
          <span>💬</span>
          <p>Sélectionne une conversation ou démarres-en une nouvelle.</p>
        </div>
      </section>
    </div>
  </UiFloatingWindow>
</template>

<style scoped>
.dm-hub {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.dm-hub__rail {
  width: 248px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid var(--surface-divider);
}
.dm-hub__new {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px;
  padding: 9px 12px;
  border: 1px solid var(--surface-border);
  border-radius: 10px;
  background: var(--surface-tinted);
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}
.dm-hub__new:hover {
  background: var(--surface-tinted-strong);
}
.dm-hub__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.dm-hub__placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  padding: 24px;
  color: var(--ink-faint);
  font-size: 13px;
}
.dm-hub__placeholder span {
  font-size: 28px;
}
</style>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { usePluginModalsStore, type ActiveModal } from '~/stores/pluginModals';

const modals = usePluginModalsStore();
const socket = useSocket();
const values = ref<Record<string, unknown>>({});

function onModalOpen(payload: ActiveModal) {
  values.value = {};
  modals.open(payload);
}

function onModalClose(payload: { modalId: string }) {
  modals.close(payload.modalId);
}

function emitInteraction(actionId: string) {
  const m = modals.active;
  if (!m) return;
  socket.connect().emit('plugin:interaction', {
    surface: 'modal',
    surfaceId: m.modalId,
    actionId,
    values: { ...values.value },
    serverId: m.serverId,
  });
}

function onChange(id: string, v: unknown) {
  values.value = { ...values.value, [id]: v };
}

function close() {
  modals.close();
}

let raw: ReturnType<typeof socket.connect> | null = null;

onMounted(() => {
  raw = socket.connect();
  raw.on('plugin:modal:open', onModalOpen);
  raw.on('plugin:modal:close', onModalClose);
});

onUnmounted(() => {
  raw?.off('plugin:modal:open', onModalOpen);
  raw?.off('plugin:modal:close', onModalClose);
});
</script>

<template>
  <UiFloatingWindow
    v-if="modals.active"
    :title="modals.active.title"
    :initial-width="480"
    :initial-height="380"
    :min-width="360"
    :min-height="240"
    @close="close"
  >
    <div class="p-5 flex flex-col gap-4 h-full overflow-y-auto">
      <PluginComponentRenderer
        v-for="(child, i) in modals.active.children"
        :key="i"
        :node="child"
        @action="emitInteraction"
        @change="onChange"
      />

      <div
        v-if="modals.active.submitLabel || modals.active.cancelLabel"
        class="mt-auto pt-3 flex items-center justify-end gap-2"
        style="border-top: 1px solid rgba(255, 255, 255, 0.06)"
      >
        <button
          v-if="modals.active.cancelLabel"
          type="button"
          class="px-3 py-1.5 rounded-md text-xs font-medium"
          style="color: rgba(255, 255, 255, 0.55)"
          @click="close"
        >
          {{ modals.active.cancelLabel }}
        </button>
        <button
          v-if="modals.active.submitLabel"
          type="button"
          class="px-3 py-1.5 rounded-md text-xs font-medium"
          style="background: rgba(99, 102, 241, 0.9); color: white"
          @click="emitInteraction('submit')"
        >
          {{ modals.active.submitLabel }}
        </button>
      </div>
    </div>
  </UiFloatingWindow>
</template>

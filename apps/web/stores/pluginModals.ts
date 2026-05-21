import { defineStore } from 'pinia';
import type { ComponentTree } from '@nookapp/protocol';

export interface ActiveModal {
  pluginId: string;
  modalId: string;
  serverId: string;
  title: string;
  children: ComponentTree;
  submitLabel?: string;
  cancelLabel?: string;
}

export const usePluginModalsStore = defineStore('pluginModals', () => {
  const active = ref<ActiveModal | null>(null);

  function open(modal: ActiveModal) {
    active.value = modal;
  }

  function close(modalId?: string) {
    if (!active.value) return;
    if (modalId && active.value.modalId !== modalId) return;
    active.value = null;
  }

  return { active, open, close };
});

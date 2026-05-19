import { ref } from 'vue';
import type { Ref, ComputedRef } from 'vue';

type ServerIdSource = Ref<string> | ComputedRef<string>;

export function useInviteFlow(serverId: ServerIdSource) {
  const { createInvite } = useInvites();

  const isOpen = ref(false);
  const url = ref('');
  const loading = ref(false);
  const copied = ref(false);

  async function open() {
    isOpen.value = true;
    if (url.value) return;
    loading.value = true;
    try {
      const invite = await createInvite(serverId.value);
      url.value = `${window.location.origin}/invite/${invite.code}`;
    } finally {
      loading.value = false;
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(url.value);
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  }

  function close() {
    isOpen.value = false;
  }

  return { isOpen, url, loading, copied, open, copy, close };
}

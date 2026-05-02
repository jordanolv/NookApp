import { useAuthStore } from '~/stores/auth';
import type { UserPublic } from '@nookapp/protocol';

export default defineNuxtPlugin(async () => {
  const store = useAuthStore();
  const { apiBase } = useRuntimeConfig().public;

  try {
    const user = await $fetch<UserPublic>(`${apiBase}/users/me`, {
      credentials: 'include',
    });
    store.setUser(user);
  } catch {
    store.setUser(null);
  }
});

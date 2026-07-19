import { useAuthStore } from '~/stores/auth';
import type { UserPublic } from '@nookapp/protocol';

export function useAuth() {
  const store = useAuthStore();
  const { apiBase, authBase } = useRuntimeConfig().public;

  const user = computed(() => store.user);
  const isAuthenticated = computed(() => store.isAuthenticated);
  const ready = computed(() => store.ready);

  async function refreshUser() {
    try {
      const u = await $fetch<UserPublic>(`${apiBase}/users/me`, { credentials: 'include' });
      store.setUser(u);
    } catch {
      store.setUser(null);
    }
  }

  async function signIn(email: string, password: string) {
    await $fetch(`${authBase}/sign-in/email`, {
      method: 'POST',
      body: { email, password },
      credentials: 'include',
    });
    await refreshUser();
  }

  async function signUp(name: string, username: string, email: string, password: string) {
    await $fetch(`${authBase}/sign-up/email`, {
      method: 'POST',
      body: { name, username, email, password },
      credentials: 'include',
    });
  }

  async function requestPasswordReset(email: string) {
    await $fetch(`${authBase}/request-password-reset`, {
      method: 'POST',
      body: {
        email,
        redirectTo: `${window.location.origin}/auth/reset-password`,
      },
      credentials: 'include',
    });
  }

  async function resetPassword(token: string, newPassword: string) {
    await $fetch(`${authBase}/reset-password`, {
      method: 'POST',
      body: { token, newPassword },
      credentials: 'include',
    });
  }

  async function signOut() {
    await $fetch(`${authBase}/sign-out`, {
      method: 'POST',
      credentials: 'include',
    });
    store.setUser(null);
  }

  return {
    user,
    isAuthenticated,
    ready,
    signIn,
    signUp,
    signOut,
    refreshUser,
    requestPasswordReset,
    resetPassword,
  };
}

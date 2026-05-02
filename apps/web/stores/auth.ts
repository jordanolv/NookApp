import { defineStore } from 'pinia';
import type { UserPublic } from '@nookapp/protocol';

export const useAuthStore = defineStore('auth', {
  state: (): { user: UserPublic | null; ready: boolean } => ({
    user: null,
    ready: false,
  }),
  getters: {
    isAuthenticated: (s) => s.user !== null,
  },
  actions: {
    setUser(user: UserPublic | null) {
      this.user = user;
      this.ready = true;
    },
  },
});

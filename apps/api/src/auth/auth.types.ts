import type { Auth } from './auth.factory';

export const AUTH = Symbol('AUTH');
export type AuthInstance = Auth;

export interface AuthSession {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    image?: string | null;
    createdAt: Date;
  };
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
  };
}

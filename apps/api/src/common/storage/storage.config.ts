import { resolve } from 'node:path';

export const UPLOADS_ROOT = resolve(process.cwd(), 'uploads');
export const UPLOADS_URL_PREFIX = '/uploads';

export type StorageScope = 'channel-icons';

export const STORAGE_SCOPES: readonly StorageScope[] = ['channel-icons'] as const;

export function scopeDir(scope: StorageScope): string {
  return resolve(UPLOADS_ROOT, scope);
}

export function scopeUrlPrefix(scope: StorageScope): string {
  return `${UPLOADS_URL_PREFIX}/${scope}`;
}

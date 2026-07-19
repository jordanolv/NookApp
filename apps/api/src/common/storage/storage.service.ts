import { unlink } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import {
  scopeDir,
  scopeUrlPrefix,
  STORAGE_SCOPES,
  UPLOADS_URL_PREFIX,
  type StorageScope,
} from './storage.config';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  urlFor(scope: StorageScope, filename: string): string {
    return `${scopeUrlPrefix(scope)}/${filename}`;
  }

  // Delete a previously-stored asset given the URL we returned at upload time.
  // No-op for unknown / external URLs so callers can pass through optimistically.
  async deleteByUrl(url: string | null | undefined): Promise<void> {
    const path = this.resolveLocalPath(url);
    if (!path) return;
    try {
      await unlink(path);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') return;
      this.logger.warn(`Failed to delete ${path}: ${(err as Error).message}`);
    }
  }

  private resolveLocalPath(url: string | null | undefined): string | null {
    if (!url || !url.startsWith(`${UPLOADS_URL_PREFIX}/`)) return null;
    const rest = url.slice(UPLOADS_URL_PREFIX.length + 1);
    const [scope, ...tail] = rest.split('/');
    if (!STORAGE_SCOPES.includes(scope as StorageScope) || tail.length !== 1) return null;
    // basename guards against any traversal hidden in the path tail.
    const safe = basename(tail[0]);
    return resolve(scopeDir(scope as StorageScope), safe);
  }
}

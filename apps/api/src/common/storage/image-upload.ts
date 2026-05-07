import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { diskStorage } from 'multer';
import { scopeDir, type StorageScope } from './storage.config';

export interface ImageUploadConfig {
  scope: StorageScope;
  maxSizeBytes?: number;
}

const DEFAULT_MAX_SIZE = 8 * 1024 * 1024;

export function imageUploadOptions({
  scope,
  maxSizeBytes = DEFAULT_MAX_SIZE,
}: ImageUploadConfig): MulterOptions {
  return {
    storage: diskStorage({
      destination: scopeDir(scope),
      filename: (_req, file, cb) => {
        cb(null, `${randomUUID()}${extname(file.originalname)}`);
      },
    }),
    limits: { fileSize: maxSizeBytes },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        cb(new BadRequestException('Only image files are accepted'), false);
        return;
      }
      cb(null, true);
    },
  };
}

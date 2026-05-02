import { z } from 'zod';

export const pluginManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, 'id must be lowercase kebab-case'),
  version: z.string(),
  displayName: z.string(),
  description: z.string(),
  author: z.string(),
  permissions: z.array(z.string()).default([]),
  entry: z.object({
    server: z.string(),
    client: z.string().optional(),
  }),
});

export type PluginManifest = z.infer<typeof pluginManifestSchema>;

import { z } from 'zod';
import { capabilitiesSchema } from './capabilities';

export const PLUGIN_PROTOCOL_VERSION = 1 as const;

export const handshakeRequestSchema = z.object({
  protocolVersion: z.literal(PLUGIN_PROTOCOL_VERSION),
  token: z.string().min(1),
  plugin: z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    version: z.string(),
    displayName: z.string().max(64),
    description: z.string().max(280).optional(),
  }),
  capabilities: capabilitiesSchema,
});

export const handshakeOkSchema = z.object({
  ok: z.literal(true),
  pluginId: z.string(),
  enabledServerIds: z.array(z.string()),
});

export const handshakeErrorCodeSchema = z.enum([
  'invalid_token',
  'invalid_manifest',
  'protocol_mismatch',
  'capability_rejected',
  'already_connected',
]);

export const handshakeErrorSchema = z.object({
  ok: z.literal(false),
  code: handshakeErrorCodeSchema,
  message: z.string(),
});

export const handshakeResponseSchema = z.union([handshakeOkSchema, handshakeErrorSchema]);

export type HandshakeRequest = z.infer<typeof handshakeRequestSchema>;
export type HandshakeOk = z.infer<typeof handshakeOkSchema>;
export type HandshakeErrorCode = z.infer<typeof handshakeErrorCodeSchema>;
export type HandshakeError = z.infer<typeof handshakeErrorSchema>;
export type HandshakeResponse = z.infer<typeof handshakeResponseSchema>;

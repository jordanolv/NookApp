import { z } from 'zod';

export const createPluginRegistrationInputSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().max(280).optional(),
});

export type CreatePluginRegistrationInput = z.infer<typeof createPluginRegistrationInputSchema>;

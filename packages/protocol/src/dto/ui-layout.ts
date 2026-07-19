import { z } from 'zod';

export const uiLayoutEntrySchema = z
  .object({
    x: z.number().finite().optional(),
    y: z.number().finite().optional(),
    width: z.number().finite().positive().optional(),
    height: z.number().finite().positive().optional(),
  })
  .catchall(z.union([z.string(), z.number(), z.boolean(), z.null()]));
export type UiLayoutEntry = z.infer<typeof uiLayoutEntrySchema>;

export const uiLayoutSchema = z.record(z.string(), uiLayoutEntrySchema);
export type UiLayout = z.infer<typeof uiLayoutSchema>;

export const uiLayoutPatchInputSchema = z.object({
  entries: z.record(z.string(), uiLayoutEntrySchema.nullable()),
});
export type UiLayoutPatchInput = z.infer<typeof uiLayoutPatchInputSchema>;

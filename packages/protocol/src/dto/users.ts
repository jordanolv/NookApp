import { z } from 'zod';

export const ownedServerMemberSchema = z.object({
  userId: z.string(),
  name: z.string(),
});
export type OwnedServerMember = z.infer<typeof ownedServerMemberSchema>;

export const ownedServerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  members: z.array(ownedServerMemberSchema),
});
export type OwnedServerSummary = z.infer<typeof ownedServerSummarySchema>;

// transfers maps a serverId to the userId who should become the new owner,
// or null to delete that server along with the account.
export const deleteAccountInputSchema = z.object({
  transfers: z.record(z.string(), z.string().nullable()),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountInputSchema>;

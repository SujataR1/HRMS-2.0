import { z } from "zod";

export const hrGetMembersByTeamIdSchema = z.object({
  teamId: z.string().min(1),
  includeInactive: z.boolean().optional(), // default false
});
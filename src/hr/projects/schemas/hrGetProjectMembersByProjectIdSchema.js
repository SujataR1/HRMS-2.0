import { z } from "zod";

export const hrGetProjectMembersByProjectIdSchema = z.object({
  projectId: z.string().min(1),
  includeInactive: z.boolean().optional(),
});
import { z } from "zod";

export const hrRejectStatusChangeSchema = z.object({
  taskStatusChangeId: z.string().min(1),
  decisionRemark: z.string().nullable().optional(),
  actorProjectMemberId: z.string().min(1),
});
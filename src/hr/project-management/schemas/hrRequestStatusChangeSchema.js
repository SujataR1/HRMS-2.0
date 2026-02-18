import { z } from "zod";

export const hrRequestStatusChangeSchema = z.object({
  taskId: z.string().min(1),
  toStatus: z.enum(["todo", "in_progress", "blocked", "done"]),
  requestRemark: z.string().nullable().optional(),
  actorProjectMemberId: z.string().min(1),
});
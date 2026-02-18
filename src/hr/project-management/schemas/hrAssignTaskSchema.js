import { z } from "zod";

export const hrAssignTaskSchema = z.object({
  taskId: z.string().min(1),
  projectMemberIds: z.array(z.string().min(1)).min(1),
});
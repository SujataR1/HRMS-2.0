import { z } from "zod";

export const hrGetTaskStatusHistorySchema = z.object({
  taskId: z.string().min(1),
});
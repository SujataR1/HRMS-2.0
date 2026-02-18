import { z } from "zod";

export const hrGetTaskByIdSchema = z.object({
  taskId: z.string().min(1)
});
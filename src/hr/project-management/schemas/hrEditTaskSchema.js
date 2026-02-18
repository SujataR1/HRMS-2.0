import { z } from "zod";

export const hrEditTaskSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  dueAt: z.string().datetime().nullable().optional()
});
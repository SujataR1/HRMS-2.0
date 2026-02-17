import { z } from "zod";

export const hrEditProjectSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().min(1).nullable().optional(),
  status: z.enum(["planned", "active", "paused", "completed", "cancelled"]).optional(),
});
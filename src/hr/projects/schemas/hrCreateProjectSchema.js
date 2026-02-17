import { z } from "zod";

export const hrCreateProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).nullable().optional(),
  status: z.enum(["planned", "active", "paused", "completed", "cancelled"]).optional(),
});
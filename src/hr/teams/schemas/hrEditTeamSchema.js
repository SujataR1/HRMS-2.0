import { z } from "zod";

export const hrEditTeamSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
});
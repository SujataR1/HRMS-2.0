import { z } from "zod";

export const hrCreateTeamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  description: z.string().min(1).nullable().optional(),
});
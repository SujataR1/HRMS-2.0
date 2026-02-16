import { z } from "zod";

export const hrGetAllTeamsSchema = z.object({
  isActive: z.boolean().optional(),
}).optional();
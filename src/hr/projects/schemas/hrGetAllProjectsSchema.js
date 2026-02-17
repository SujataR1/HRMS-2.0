import { z } from "zod";

export const hrGetAllProjectsSchema = z
  .object({
    status: z.enum(["planned", "active", "paused", "completed", "cancelled"]).optional(),
  })
  .optional();
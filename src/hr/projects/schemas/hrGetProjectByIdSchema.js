import { z } from "zod";

export const hrGetProjectByIdSchema = z.object({
  projectId: z.string().min(1),
});
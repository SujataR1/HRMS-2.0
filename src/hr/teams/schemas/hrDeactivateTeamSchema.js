import { z } from "zod";

export const hrDeactivateTeamSchema = z.object({
  teamId: z.string().min(1),
});
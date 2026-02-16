import { z } from "zod";

export const hrUnassignTeamMembersSchema = z.object({
  teamId: z.string().min(1),
  employeeIds: z.array(z.string().min(1)).min(1),
});
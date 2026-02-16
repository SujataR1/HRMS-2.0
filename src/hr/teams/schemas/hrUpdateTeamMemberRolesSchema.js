import { z } from "zod";

export const hrUpdateTeamMemberRolesSchema = z.object({
  teamId: z.string().min(1),
  role: z.enum(["leader", "member"]),
  employeeIds: z.array(z.string().min(1)).min(1),
});
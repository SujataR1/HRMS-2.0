import { z } from "zod";

export const hrUpdateProjectMemberRolesSchema = z.object({
  projectId: z.string().min(1),
  role: z.enum(["lead", "contributor"]),
  employeeIds: z.array(z.string().min(1)).min(1), // Employee.employeeId
});
import { z } from "zod";

export const hrUnassignProjectMembersSchema = z.object({
  projectId: z.string().min(1),
  employeeIds: z.array(z.string().min(1)).min(1), // Employee.employeeId
});
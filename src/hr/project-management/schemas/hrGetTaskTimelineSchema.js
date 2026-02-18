import { z } from "zod";

export const hrGetTaskTimelineSchema = z.object({
  // At least one required
  taskId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),

  // Filters
  employeeId: z.string().min(1).optional(),       // Employee.employeeId like "E102"
  projectMemberId: z.string().min(1).optional(),

  // Timeline window (your "from(Optional) to(Optional)")
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),

  // CreatedAt window
  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),

  // Pagination
  limit: z.number().int().min(1).max(200).optional(),
  offset: z.number().int().min(0).optional(),
}).refine((d) => d.taskId || d.projectId, {
  message: "Either taskId or projectId is required",
});
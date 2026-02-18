import { z } from "zod";

export const hrGetTasksByProjectSchema = z.object({
  projectId: z.string().min(1),

  assignedEmployeeId: z.string().min(1).optional(), // Employee.employeeId
  status: z.enum(["todo", "in_progress", "blocked", "done"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),

  dueFrom: z.string().datetime().optional(),
  dueTo: z.string().datetime().optional(),

  createdFrom: z.string().datetime().optional(),
  createdTo: z.string().datetime().optional(),

  updatedFrom: z.string().datetime().optional(),
  updatedTo: z.string().datetime().optional(),

  onlyIds: z.boolean().optional(),
});
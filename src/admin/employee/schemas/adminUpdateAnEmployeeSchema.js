import { z } from "zod";

export const adminUpdateAnEmployeeSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  updates: z.object({
    name: z.string().optional(),
    assignedEmail: z.string().email("Invalid email").optional(),
    password: z.string().min(6).optional(),
  })
});

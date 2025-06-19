import { z } from "zod";

export const adminCreateAnEmployeeSchema = z.object({
  name: z.string().min(1, "Employee name is required"),
  employeeId: z.string().min(1, "Employee ID is required"),
  assignedEmail: z.string().email("Invalid email address")
});

import { z } from "zod";

export const adminAssignAnEmployeeAShiftSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  shiftId: z.string().min(1, "Shift ID is required"),
});

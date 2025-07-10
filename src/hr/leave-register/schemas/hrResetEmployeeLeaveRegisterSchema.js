import { z } from "zod";

export const hrResetEmployeeLeaveRegisterSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
});

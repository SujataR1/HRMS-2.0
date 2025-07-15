import { z } from "zod";

export const hrGetEmployeeLeaveRegisterSchema = z.object({
  employeeIds: z.array(z.string().min(1, "Employee ID cannot be empty"))
                .min(1, "At least one Employee ID is required"),
});

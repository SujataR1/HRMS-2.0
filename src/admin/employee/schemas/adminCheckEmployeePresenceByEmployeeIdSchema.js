import { z } from "zod";

export const adminCheckEmployeePresenceByEmployeeIdSchema = z.object({
  employeeId: z
    .string({ required_error: "employeeId is required" })
    .min(1, "employeeId is required")
    .transform((s) => s.trim()),
});

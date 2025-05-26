import { z } from "zod";

export const hrUpdateAnEmployeeSchema = z
	.object({
		employeeId: z.string().min(1),
		name: z.string().min(1).optional(),
		assignedEmail: z.string().email().optional(),
	})
	.refine((data) => data.name || data.assignedEmail, {
		message: "At least one of name or assignedEmail must be provided",
	});

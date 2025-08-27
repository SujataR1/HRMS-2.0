import { z } from "zod";

export const EmployeeGenerateAndSendMonthlyReportsSchema = z.object({
	monthYear: z.string().regex(/^(0[1-9]|1[0-2])-\d{4}$/, {
		message: "monthYear must be in MM-YYYY format",
	}),

	employeeIds: z
		.array(z.string().min(1, "Employee ID cannot be empty"))
		.optional()
		.default([]),

	shiftIds: z
		.array(z.string().min(1, "Shift ID cannot be empty"))
		.optional()
		.default([]),
});

import { z } from "zod";

export const adminPromoteEmployeeToHRSchema = z.object({
	employeeId: z
		.string({ required_error: "Employee ID is required" }),

	customPassword: z
		.string()
		.min(8, "Password must be at least 8 characters")
		.optional(),
});

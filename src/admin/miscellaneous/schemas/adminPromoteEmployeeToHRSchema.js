import { z } from "zod";

export const adminPromoteEmployeeToHRSchema = z.object({
	employeeId: z
		.string({ required_error: "Employee ID is required" })
		.uuid("Employee ID must be a valid UUID"),

	customPassword: z
		.string()
		.min(8, "Password must be at least 8 characters")
		.optional(),
});

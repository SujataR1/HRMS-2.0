import { z } from "zod";

export const adminDemoteHRSchema = z.object({
	employeeId: z
		.string({ required_error: "Employee ID is required" })
		.uuid("Employee ID must be a valid UUID"),
});

import { z } from "zod";

export const adminDemoteHRSchema = z.object({
	employeeId: z
		.string({ required_error: "Employee ID is required" })
});

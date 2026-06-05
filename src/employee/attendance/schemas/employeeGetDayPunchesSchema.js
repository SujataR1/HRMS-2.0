import { z } from "zod";

export const employeeGetDayPunchesSchema = z.object({
	date: z
		.string({
			required_error: "date is required",
		})
		.regex(/^\d{4}-\d{2}-\d{2}$/, {
			message: "Date must be in YYYY-MM-DD format",
		}),
});
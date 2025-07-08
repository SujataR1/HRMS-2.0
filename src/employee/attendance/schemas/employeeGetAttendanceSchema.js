import { z } from "zod";

export const employeeGetAttendanceSchema = z
	.object({
		date: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, {
				message: "Date must be in YYYY-MM-DD format (UTC)",
			})
			.optional(),

		monthYear: z
			.string()
			.regex(/^(0[1-9]|1[0-2])-\d{4}$/, {
				message: "monthYear must be in MM-YYYY format (UTC)",
			})
			.optional(),

		year: z
			.string()
			.regex(/^\d{4}$/, {
				message: "Year must be a 4-digit string (UTC)",
			})
			.optional(),
	})
	.refine(
		(data) => data.date || data.monthYear || data.year,
		{
			message: "At least one of date, monthYear, or year must be provided",
		}
	);

import { z } from "zod";

export const AdminMakeOrRefreshEmployeeAttendanceSchema = z.object({
	employeeId: z.string().optional(),

	date: z
		.string()
		.regex(
			/^\d{4}-\d{2}-\d{2}$/,
			"Date must be in YYYY-MM-DD format (in TIMEZONE)"
		)
		.optional(),

	monthYear: z
		.string()
		.regex(
			/^(0[1-9]|1[0-2])-\d{4}$/,
			"monthYear must be in MM-YYYY format (in TIMEZONE)"
		)
		.optional(),

	year: z
		.string()
		.regex(/^\d{4}$/, "Year must be a 4-digit string (in TIMEZONE)")
		.optional(),
});

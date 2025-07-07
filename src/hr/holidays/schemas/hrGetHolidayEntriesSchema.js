import { z } from "zod";

export const hrGetHolidayEntriesSchema = z
	.object({
		shiftIds: z
			.array(z.string().uuid("Each shiftId must be a valid UUID"))
			.optional(),

		fromDate: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, {
				message: "fromDate must be in YYYY-MM-DD format (UTC)",
			})
			.optional(),

		toDate: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, {
				message: "toDate must be in YYYY-MM-DD format (UTC)",
			})
			.optional(),
	})
	.refine(
		(data) =>
			(!data.fromDate && !data.toDate) ||
			(data.fromDate && data.toDate),
		{
			message: "Both fromDate and toDate must be provided together",
			path: ["fromDate", "toDate"],
		}
	);

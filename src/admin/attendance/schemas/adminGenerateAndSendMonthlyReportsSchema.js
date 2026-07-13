import { z } from "zod";

export const AdminGenerateAndSendMonthlyReportsSchema = z
	.object({
		monthYear: z
			.string()
			.regex(/^(0[1-9]|1[0-2])-\d{4}$/, {
				message: "monthYear must be in MM-YYYY format",
			})
			.optional(),

		year: z.coerce
			.number()
			.int("year must be a whole number")
			.min(1900, "year must be 1900 or later")
			.max(9999, "year must be a valid 4-digit year")
			.optional(),

		employeeIds: z
			.array(z.string().min(1, "Employee ID cannot be empty"))
			.optional()
			.default([]),

		shiftIds: z
			.array(z.string().min(1, "Shift ID cannot be empty"))
			.optional()
			.default([]),
	})
	.superRefine((data, ctx) => {
		if (!data.monthYear && !data.year) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["monthYear"],
				message: "Either monthYear or year is required",
			});
		}

		if (data.monthYear && data.year) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["year"],
				message: "Provide either monthYear or year, not both",
			});
		}
	});

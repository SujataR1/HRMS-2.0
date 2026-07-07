import { z } from "zod";

const LEAVE_STATUSES = ["pending", "approved", "rejected", "cancelled"];
const LEAVE_TYPES = [
	"CASUAL",
	"SICK",
	"EARNED",
	"UNPAID",
	"PAID",
	"COMP_OFF",
	"MATERNITY",
	"PATERNITY",
	"BEREAVEMENT",
	"LOP",
	"OTHER",
];

export const employeeGetLeavesSchema = z.object({
	fromDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, {
			message: "fromDate must be in YYYY-MM-DD format",
		})
		.optional(),

	toDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, {
			message: "toDate must be in YYYY-MM-DD format",
		})
		.optional(),

	status: z
		.enum(LEAVE_STATUSES)
		.optional(),

	type: z
		.enum(LEAVE_TYPES)
		.optional(),
});

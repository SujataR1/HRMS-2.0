import { z } from "zod";
import { LeaveStatus, LeaveType } from "@prisma/client";

export const hrGetLeavesSchema = z.object({
	employeeId: z
		.string()
		.optional(),

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
		.enum([...Object.values(LeaveStatus)])
		.optional(),

	type: z
		.enum([...Object.values(LeaveType)])
		.optional(),
});

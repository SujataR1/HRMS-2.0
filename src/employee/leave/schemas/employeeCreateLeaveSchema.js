import { z } from "zod";
import { LeaveType } from "@prisma/client"; // ← Prisma enum import

export const employeeCreateLeaveSchema = z.object({
	fromDate: z
		.string({ required_error: "fromDate is required" })
		.regex(/^\d{4}-\d{2}-\d{2}$/, {
			message: "fromDate must be in YYYY-MM-DD format",
		}),

	toDate: z
		.string({ required_error: "toDate is required" })
		.regex(/^\d{4}-\d{2}-\d{2}$/, {
			message: "toDate must be in YYYY-MM-DD format",
		}),

	leaveType: z
		.array(z.enum([...(Object.values(LeaveType))]), {
			required_error: "leaveType is required",
		})
		.min(1, "At least one leave type must be selected"),

	otherTypeDescription: z
		.string()
		.max(300, "Too long")
		.optional()
		.nullable(),

	applicationNotes: z
		.string()
		.max(1000, "Note too long")
		.optional()
		.nullable(),
});

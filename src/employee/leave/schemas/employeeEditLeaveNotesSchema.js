import { z } from "zod";

export const employeeEditLeaveNotesSchema = z.object({
	leaveId: z
		.string({ required_error: "leaveId is required" })
		.uuid("Invalid leave ID"),

	applicationNotes: z
		.string()
		.max(1000, "Note too long")
		.optional()
		.nullable(),

	otherTypeDescription: z
		.string()
		.max(300, "Description too long")
		.optional()
		.nullable(),
});

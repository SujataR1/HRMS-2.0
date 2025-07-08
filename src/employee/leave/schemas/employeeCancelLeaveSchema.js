import { z } from "zod";

export const employeeCancelLeaveSchema = z.object({
	leaveId: z
		.string({ required_error: "leaveId is required" })
		.uuid("Invalid leave ID"),
});

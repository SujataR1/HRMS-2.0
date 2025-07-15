import { z } from "zod";

export const employeeUploadLeaveAttachmentsSchema = z.object({
	leaveId: z
		.string({ required_error: "leaveId is required" })
		.uuid("Invalid leave ID"),

	attachmentPaths: z
		.array(
			z
				.string()
				.min(1, "Attachment path cannot be empty")
				.max(1000, "Attachment path too long")
		)
		.min(1, "At least one attachment path must be provided"),
});

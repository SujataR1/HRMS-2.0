import { z } from "zod";

export const hrChangePasswordSchema = z.object({
	oldPassword: z
		.string()
		.min(8, "Old password must be at least 8 characters"),
	newPassword: z
		.string()
		.min(8, "New password must be at least 8 characters"),
});

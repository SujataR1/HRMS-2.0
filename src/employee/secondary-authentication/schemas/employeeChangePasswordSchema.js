import { z } from "zod";

export const employeeChangePasswordSchema = z.object({
	oldPassword: z.string().min(8),
	newPassword: z.string().min(8),
});

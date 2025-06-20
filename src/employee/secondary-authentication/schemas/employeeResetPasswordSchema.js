import { z } from "zod";

export const employeeResetPasswordSchema = z.object({
	assignedEmail: z.string().email(),
	otp: z.string().length(6),
	newPassword: z.string().min(8),
});

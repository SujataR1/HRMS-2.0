import { z } from "zod";

export const hrResetPasswordSchema = z.object({
	email: z.string().email("Invalid email address"),
	otp: z.string().min(6, "OTP must be at least 6 digits"),
	newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

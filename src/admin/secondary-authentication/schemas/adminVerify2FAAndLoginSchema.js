import { z } from "zod";

export const adminVerify2FAAndLoginSchema = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
	otp: z.string().min(6, "OTP must be at least 6 digits"),
});

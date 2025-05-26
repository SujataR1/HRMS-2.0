import { z } from "zod";

export const adminVerifyEmailSchema = z.object({
	otp: z.string().min(6, "OTP must be at least 6 digits"),
});

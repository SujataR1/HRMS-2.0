import { z } from "zod";

export const hrResendOTPSchema = z.object({
	email: z.string().email("Invalid email address"),
});
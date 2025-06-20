import { z } from "zod";

export const employeeVerify2FAAndLoginSchema = z.object({
	assignedEmail: z.string().email(),
	password: z.string().min(8),
	otp: z.string().length(6),
});

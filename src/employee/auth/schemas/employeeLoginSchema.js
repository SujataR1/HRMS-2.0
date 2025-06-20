import { z } from "zod";

export const employeeLoginSchema = z.object({
	assignedEmail: z.string().email(),
	password: z.string().min(8),
});

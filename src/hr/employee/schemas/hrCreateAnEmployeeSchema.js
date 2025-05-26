import { z } from "zod";

export const hrCreateAnEmployeeSchema = z.object({
	name: z.string().min(1).max(128),
	employeeId: z.string().min(1).max(64),
	assignedEmail: z.string().email(),
	password: z.string().min(8),
});

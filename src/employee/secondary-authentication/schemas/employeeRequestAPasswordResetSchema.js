import { z } from "zod";

export const employeeRequestAPasswordResetSchema = z.object({
	assignedEmail: z.string().email(),
});

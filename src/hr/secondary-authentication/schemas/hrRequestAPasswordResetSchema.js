import { z } from "zod";

export const hrRequestAPasswordResetSchema = z.object({
	email: z.string().email("Invalid email address"),
});

import { z } from "zod";

export const adminRequestAPasswordResetSchema = z.object({
	email: z.string().email("Invalid email address"),
});

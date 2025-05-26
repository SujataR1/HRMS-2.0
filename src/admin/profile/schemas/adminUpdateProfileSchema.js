import { z } from "zod";

export const adminUpdateProfileSchema = z
	.object({
		name: z.string().min(1, "Name cannot be empty").optional(),
		email: z.string().email("Invalid email format").optional(),
	})
	.refine((data) => data.name || data.email, {
		message: "At least one of name or email must be provided",
	});

import { z } from "zod";

export const adminRevokeAllActiveSessionsSchema = z.object({
	password: z.string().min(8, "Password must be at least 8 characters"),
});

import { z } from "zod";

export const adminActOnUserInfraRequestSchema = z.object({
	body: z.object({
		action: z.enum(["approve", "deny", "delegate"]),
		note: z.string().max(1000).optional(),
		delegateToHr: z.boolean().optional(),
		showToHr: z.boolean().optional(),
	}),

	query: z.object({
		requestId: z.string().uuid(),
	}),
});

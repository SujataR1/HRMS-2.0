import { z } from "zod";

export const adminGetUserInfraRequestsSchema = z.object({
	query: z.object({
		limit: z
			.string()
			.regex(
				/^(all|[1-9]\d{0,4}-(end|[1-9]\d{0,4}))$/,
				"Invalid format for 'limit'. Use 'all' or 'start-end'."
			),
	}),
});

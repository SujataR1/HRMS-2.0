import fp from "fastify-plugin";
import { hrEditAHolidayEntry } from "../methods/hrEditAHolidayEntry.js";
import { hrEditAHolidayEntrySchema } from "../schemas/hrEditAHolidayEntrySchema.js";

export default fp(async function hrEditHolidayRoute(fastify) {
	fastify.patch("/hr/holidays/edit", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = hrEditAHolidayEntrySchema.safeParse(request.body);

		if (!parsed.success) {
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await hrEditAHolidayEntry(authHeader, parsed.data);

			return reply.code(200).send({
				status: "success",
				message: result.message,
				updatedFields: result.updatedFields,
			});
		} catch (err) {
			request.log.error({ err }, "❌ Failed to edit holiday entry");
			return reply.code(400).send({
				status: "error",
				message: err.message || "Failed to edit holiday",
			});
		}
	});
});

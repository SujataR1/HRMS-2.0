import fp from "fastify-plugin";
import { hrGetHolidayEntries } from "../methods/hrGetHolidayEntries.js";
import { hrGetHolidayEntriesSchema } from "../schemas/hrGetHolidayEntriesSchema.js";

export default fp(async function hrGetHolidayEntriesRoute(fastify) {
	fastify.post("/hr/holidays/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = hrGetHolidayEntriesSchema.safeParse(request.body);

		if (!parsed.success) {
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const holidays = await hrGetHolidayEntries({
				authHeader,
				...parsed.data,
			});

			return reply.code(200).send({
				status: "success",
				data: holidays,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch holidays");
			return reply.code(500).send({
				status: "error",
				message: "Failed to fetch holiday entries",
				detail: error.message,
			});
		}
	});
});

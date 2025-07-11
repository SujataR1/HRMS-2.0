import fp from "fastify-plugin";
import { hrEditAHolidayEntry } from "../methods/hrEditAHolidayEntry.js";
import { hrEditAHolidayEntrySchema } from "../schemas/hrEditAHolidayEntrySchema.js";

export default fp(async function hrEditHolidayRoute(fastify) {
	fastify.patch("/hr/holidays/edit", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "wrgF6HgPXbhVhhQf6qwdk9gayN1y8OXr8UcqwZo4kQK4WDvveHoKMOZme4EZfAVgXjumcTXJ1h5x7rz20/ZTsw==");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = hrEditAHolidayEntrySchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "t7rqj4BGcoghINzYieU4wsZYFinrQA0ZBFIi8maq3PhRKvScLA+Dkuq75fuvfaZuJjrRLF+NLSb/or/eDx5alA==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await hrEditAHolidayEntry(authHeader, parsed.data);

			reply.header("x-auth-sign", "dY2V03b2KbyWwE+dVqOxqvNR++ahTQ9gI+7GmK6MflVT2IraGo5PUVnLlMAZ3ioUyMo103CefH61O7+ZK5Hl9Q==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
				updatedFields: result.updatedFields,
			});
		} catch (err) {
			request.log.error({ err }, "❌ Failed to edit holiday entry");
			reply.header("x-auth-sign", "UurZ4k0OpDthjvkJJRtR+wqPBAuHv/ulsiWw0rwxiIL1pjhUBArZv6xuDUta4mdEr54Ezgk/cO/Bs3/WDZUdKA==");
			return reply.code(400).send({
				status: "error",
				message: err.message || "Failed to edit holiday",
			});
		}
	});
});

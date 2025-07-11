import fp from "fastify-plugin";
import { hrGetHolidayEntries } from "../methods/hrGetHolidayEntries.js";
import { hrGetHolidayEntriesSchema } from "../schemas/hrGetHolidayEntriesSchema.js";

export default fp(async function hrGetHolidayEntriesRoute(fastify) {
	fastify.post("/hr/holidays/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "kloGBwmj36pe+OVVgrF2sFqRYB0Gd6avtPuDaqulx0uqrLO6D5YvGvcAPO/4rwmQF6hiDIitbH+FdbiwChbsvQ==");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = hrGetHolidayEntriesSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "wABCkQwxKiyfoPFJkQofDU3tPF4BoumOLSobXVWRTCmZE/C4oZvSa5Lkxt2H3PJ4qTIkJWq8kTnfe80N/z89Bw==");
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

			reply.header("x-auth-sign", "B1bLHQAZ22RX3637IgfQ9MnQv/2AhtEQKP/DlJhjMEjasjiyYa3eOyZdApxFIwMOrRrZrKTLymyo44IiOjUohg==");
			return reply.code(200).send({
				status: "success",
				data: holidays,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch holidays");
			reply.header("x-auth-sign", "H79lEXU/pj2W8G6uZ/cOV6DEtLVWDoR/eZu/uMRLC/K/BeszekkA9wsWu1BATKwC12EX4rUKuA99G03oxMJmzA==");
			return reply.code(500).send({
				status: "error",
				message: "Failed to fetch holiday entries",
				detail: error.message,
			});
		}
	});
});

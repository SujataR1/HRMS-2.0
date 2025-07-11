import fp from "fastify-plugin";
import { hrGetHolidayEntries } from "../methods/hrGetHolidayEntries.js";
import { hrGetHolidayEntriesSchema } from "../schemas/hrGetHolidayEntriesSchema.js";

export default fp(async function hrGetHolidayEntriesRoute(fastify) {
	fastify.post("/hr/holidays/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "982f10791f7b9b34d8f8e57d05a1a797 ||| baa75351f10ba4847c15408d50a6ac45b689effb8c7ea742fe984d863e1a3f51d498cd5728c399f5cd06e26a6dc0ac7e");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = hrGetHolidayEntriesSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "dad92d3dd77e7487ee24bf1f8ec8e7b0 ||| a09e003d3f4833542ca3fe5e8eef7375c4cd9c7531371e88043f812b4067ec291cc444483c8b561cee4d5de526d3e398");
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

			reply.header("x-auth-sign", "c455d4d92f5385b6158258e007a0e80e ||| d8ce552d8234fe13597ec6a8efef7dd2c57f3d53d6c89d9748ada718caeb37674d50d40886b307554d76cbaa991c6660");
			return reply.code(200).send({
				status: "success",
				data: holidays,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch holidays");
			reply.header("x-auth-sign", "72e753a54aae9f325613b6545ac846b0 ||| fc0b57c1a812b4abe5182f5ff0e4809badf0a02f6ed19acadc64c2deac775158f901afe9623d161210686ab96d176288");
			return reply.code(500).send({
				status: "error",
				message: "Failed to fetch holiday entries",
				detail: error.message,
			});
		}
	});
});

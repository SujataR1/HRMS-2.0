import fp from "fastify-plugin";
import { employeeCancelLeave } from "../methods/employeeCancelLeave.js";
import { employeeCancelLeaveSchema } from "../schemas/employeeCancelLeaveSchema.js";

export default fp(async function employeeCancelLeaveRoute(fastify) {
	fastify.post("/employee/leave/cancel", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "f6VFNpdfYO4IelggBw/8GHA8i4F55i01PzW/kmW0UL8vkRWDnUSkxQDPehxJAnjH0HlgNkVUpqLaIq1JhSIqdg==");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeCancelLeaveSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "iw8XrJoPe9C83TX45T69B6pWN6Hq/yomCsskNX7JkJ/4cAWx+bYCdxDYVS1C9s6TBhEkivShnjHiTfwJMzhzYA==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await employeeCancelLeave(authHeader, parsed.data);

			reply.header("x-auth-sign", "Vq1N86HSMIxorZCvB1JiGoWPvT2704T0Y4k5Q9iDHsORyM1VXXwwGGw2ZCUqscHiTckh94H/W+AYrzp0ghS0YQ==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to cancel leave");
			reply.header("x-auth-sign", "3aKpUlkhS6TYZdyO/gjRoVG1C/FYujN/0rjf3tf6VrL7mNblgN43IU95ZqcdhSzIboAC8ymZyXRlTzYDXj2qoQ==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Could not cancel leave",
			});
		}
	});
});

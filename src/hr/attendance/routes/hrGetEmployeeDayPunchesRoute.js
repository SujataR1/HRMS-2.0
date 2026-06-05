import fp from "fastify-plugin";
import { hrGetEmployeeDayPunches } from "../methods/hrGetEmployeeDayPunches.js";
import { HrGetEmployeeDayPunchesSchema } from "../schemas/hrGetEmployeeDayPunchesSchema.js";

export default fp(async function hrGetEmployeeDayPunchesRoute(fastify) {
	fastify.post("/hr/attendance/day-punches", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "hr-day-punches-auth-missing");
			return reply.code(401).send({
				success: false,
				error: "Authorization header missing",
			});
		}

		const parsed = HrGetEmployeeDayPunchesSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "hr-day-punches-invalid-input");
			return reply.code(400).send({
				success: false,
				error: "Invalid input",
				details: parsed.error.flatten(),
			});
		}

		try {
			const data = await hrGetEmployeeDayPunches({
				authHeader,
				...parsed.data,
			});

			reply.header("x-auth-sign", "hr-day-punches-success");
			return reply.code(200).send({
				success: true,
				data,
			});
		} catch (err) {
			request.log.error({ err }, "❌ Failed to fetch HR employee day punches");
			reply.header("x-auth-sign", "hr-day-punches-error");
			return reply.code(500).send({
				success: false,
				error: "Failed to fetch employee day punches",
				detail: err.message,
			});
		}
	});
});
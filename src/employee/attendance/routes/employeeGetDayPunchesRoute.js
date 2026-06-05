import fp from "fastify-plugin";
import { employeeGetDayPunches } from "../methods/employeeGetDayPunches.js";
import { employeeGetDayPunchesSchema } from "../schemas/employeeGetDayPunchesSchema.js";

export default fp(async function employeeGetDayPunchesRoute(fastify) {
	fastify.post("/employee/attendance/day-punches", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "employee-day-punches-auth-missing");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeGetDayPunchesSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "employee-day-punches-invalid-input");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const data = await employeeGetDayPunches({
				authHeader,
				...parsed.data,
			});

			reply.header("x-auth-sign", "employee-day-punches-success");
			return reply.code(200).send({
				status: "success",
				data,
			});
		} catch (err) {
			request.log.error({ err }, "❌ Failed to fetch employee day punches");
			reply.header("x-auth-sign", "employee-day-punches-error");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to fetch day punches",
			});
		}
	});
});
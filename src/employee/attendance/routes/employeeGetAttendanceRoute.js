import fp from "fastify-plugin";
import { employeeGetAttendance } from "../methods/employeeGetAttendance.js";
import { employeeGetAttendanceSchema } from "../schemas/employeeGetAttendanceSchema.js";

export default fp(async function employeeGetAttendanceRoute(fastify) {
	fastify.post("/employee/attendance/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeGetAttendanceSchema.safeParse(request.body);

		if (!parsed.success) {
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const data = await employeeGetAttendance({
				authHeader,
				...parsed.data,
			});

			return reply.code(200).send({
				status: "success",
				data,
			});
		} catch (err) {
			request.log.error({ err }, "❌ Failed to fetch employee attendance");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to fetch attendance records",
			});
		}
	});
});

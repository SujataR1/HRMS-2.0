import fp from "fastify-plugin";
import { employeeGetAttendance } from "../methods/employeeGetAttendance.js";
import { employeeGetAttendanceSchema } from "../schemas/employeeGetAttendanceSchema.js";

export default fp(async function employeeGetAttendanceRoute(fastify) {
	fastify.post("/employee/attendance/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "OSyvR5oqPsgUihHWTsLRS4/uvoVrrJ17W95P4g6qm59JMSIB62NiUVU3IudGJxDG+HpsBQbVYT9ck/AzTuI7Hw==");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeGetAttendanceSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "wLYj1PcnyQ6qKK5zoowC93zxigMf3rds1LhFQFipDKSHmnxQpht61pmkeJiZ1VOWixN7/eyHnA+C3XG/rEx4Pg==");
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

			reply.header("x-auth-sign", "YPq38lKS/NqWWaXPp8PvAx8rud1pThyZan0quOSECeIfmgpiJ7a1jC/kUN6Uj1L8brAkIAEbvUfG3rZhfOzIPQ==");
			return reply.code(200).send({
				status: "success",
				data,
			});
		} catch (err) {
			request.log.error({ err }, "❌ Failed to fetch employee attendance");
			reply.header("x-auth-sign", "wMg3BFOnoVic9oe0u+Elmchm6Seb+cWsoXzsOAghMFllPS4wg5C0JGUPm0kbaQjuIYL9juKfdtRstEGejnKr2Q==");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to fetch attendance records",
			});
		}
	});
});

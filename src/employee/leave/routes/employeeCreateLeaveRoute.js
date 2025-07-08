import fp from "fastify-plugin";
import { employeeCreateLeave } from "../methods/employeeCreateLeave.js";
import { employeeCreateLeaveSchema } from "../schemas/employeeCreateLeaveSchema.js";

export default fp(async function employeeCreateLeaveRoute(fastify) {
	fastify.post("/employee/leave/apply", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeCreateLeaveSchema.safeParse(request.body);

		if (!parsed.success) {
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await employeeCreateLeave(authHeader, parsed.data);

			return reply.code(200).send({
				status: "success",
				message: result.message,
				leaveId: result.leaveId,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to apply for leave");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Could not apply for leave",
			});
		}
	});
});

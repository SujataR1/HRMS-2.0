import fp from "fastify-plugin";
import { employeeCreateLeave } from "../methods/employeeCreateLeave.js";
import { employeeCreateLeaveSchema } from "../schemas/employeeCreateLeaveSchema.js";

export default fp(async function employeeCreateLeaveRoute(fastify) {
	fastify.post("/employee/leave/apply", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "5fAnDY3jYPCq0TeZoYaakn58Zl8ujCxyleGQ/a+hJBF7P4n4DzwBXk7sGMoGEluY/lnTMCdkjAWpNn8oM6WCZQ==");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeCreateLeaveSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "sbQWaGLwRfz53PAImEsoTSiqQLibupCI9h8rbWtR3iqcTTuJ7WLvj521zzXZzdnFRmHKG29039ZVKYS4hfSMTQ==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await employeeCreateLeave(authHeader, parsed.data);

			reply.header("x-auth-sign", "nVisFo1jlfwlbaSW3LMnTgWxqRk+eBS93IQGLKI/uVUccELpY/DMSJznaOg2I4KVxbXcuPBiM3VD+nAy0jkKTw==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
				leaveId: result.leaveId,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to apply for leave");
			reply.header("x-auth-sign", "tH22+0pVWu+wAyQOUOUB0qfdi4knvh1MJH10uXDDhX+0c4Eo1b32Xr5WcDl+kPjWRZAJtLYltq7oKzntK+37Fw==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Could not apply for leave",
			});
		}
	});
});

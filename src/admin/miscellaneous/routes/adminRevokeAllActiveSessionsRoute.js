import { adminRevokeAllActiveSessions } from "../methods/adminRevokeAllActiveSessions.js";
import { adminRevokeAllActiveSessionsSchema } from "../schemas/adminRevokeAllActiveSessionsSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminRevokeAllActiveSessionsRoute(fastify) {
	fastify.post("/admin/revoke-sessions", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = adminRevokeAllActiveSessionsSchema.safeParse(
				request.body
			);

			if (!parsed.success) {
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminRevokeAllActiveSessions(
				authHeader,
				parsed.data.password
			);

			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to revoke admin sessions"
			);
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to revoke sessions",
			});
		}
	});
});

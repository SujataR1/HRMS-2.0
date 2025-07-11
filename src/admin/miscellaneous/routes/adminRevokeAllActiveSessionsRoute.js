import { adminRevokeAllActiveSessions } from "../methods/adminRevokeAllActiveSessions.js";
import { adminRevokeAllActiveSessionsSchema } from "../schemas/adminRevokeAllActiveSessionsSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminRevokeAllActiveSessionsRoute(fastify) {
	fastify.post("/admin/revoke-sessions", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "4H4leFmVxxZVY25LSS5zLSVHBCk26seTpiVR4plA/qVp96QMXskFXlysVYnjAp9WipD8R7WpD9cYNrpE+XWttQ==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = adminRevokeAllActiveSessionsSchema.safeParse(
				request.body
			);

			if (!parsed.success) {
				reply.header("x-auth-sign", "UrkV/gVCoo4SpAEvHFoaluujY+YRdCr0XsA+Zu4CskwGm+h2c+lWCT8RuyIv8bZL5ZH4PianoHeUzweUErsELA==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminRevokeAllActiveSessions(
				authHeader,
				parsed.data.password
			);

			reply.header("x-auth-sign", "qnER6HB0xoMMVxmWGyYHPySP5x7facWGtz7B1xdjjjZMuLwRIuHPiMtsUkv0mgOte7mDlNz2ctlpHAIRGnssmQ==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to revoke admin sessions"
			);
			reply.header("x-auth-sign", "YIbXZwLOQQjH22vJmSOiiLQSlAaSqG9vjHpRvWk4sRsQfcAv5KpbpN8R2j/j7ciSssXnNXtCPruq3NRXpCNNYw==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to revoke sessions",
			});
		}
	});
});

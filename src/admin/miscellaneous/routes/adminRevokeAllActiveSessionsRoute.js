import { adminRevokeAllActiveSessions } from "../methods/adminRevokeAllActiveSessions.js";
import { adminRevokeAllActiveSessionsSchema } from "../schemas/adminRevokeAllActiveSessionsSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminRevokeAllActiveSessionsRoute(fastify) {
	fastify.post("/admin/revoke-sessions", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "VSBwc7aqe2/XYNsLOFfhNMjM59oHz6l3vMpit25E9rZWm9TYF6sZSCs8rbSP5SEMUos336TO9I1wpH+uQc0GdA==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = adminRevokeAllActiveSessionsSchema.safeParse(
				request.body
			);

			if (!parsed.success) {
				reply.header("x-auth-sign", "C2z7g1w31KlAaGETHrcmUf6A3vSGQN4eVFHt/8uJVyfl8pMH78Kk55/45fEwsL1pshSLFTUNfaRtyPVqieF8CA==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminRevokeAllActiveSessions(
				authHeader,
				parsed.data.password
			);

			reply.header("x-auth-sign", "yjh3qKvycbSs5B/NIyQc+0L9t/IRnVpqAgreJDpRUdQiqKgjNINMnrgVx3HW96Ino4tjZq+qJLJHW7HzQl4lRA==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to revoke admin sessions"
			);
			reply.header("x-auth-sign", "iWwcJeCR7at0tCIMwu/4/4HxGTmenJAnpuFoLbKBLzSZDPyH/4APziIKi5G+m88Y+KmuJhO3VqNVG8BeGYh+IA==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to revoke sessions",
			});
		}
	});
});

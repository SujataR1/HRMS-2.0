import fp from "fastify-plugin";
import { hrLogout } from "../methods/hrLogout.js";

export default fp(async function hrLogoutRoute(fastify) {
	fastify.post("/hr/logout", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			await hrLogout(authHeader);

			return reply.code(200).send({
				status: "success",
				message: "Logged out successfully",
			});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ HR logout failed");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Logout failed",
			});
		}
	});
});

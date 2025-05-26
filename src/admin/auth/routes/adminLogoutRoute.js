import { adminLogout } from "../methods/adminLogout.js";
import fp from "fastify-plugin";

export default fp(async function adminLogoutRoute(fastify) {
	fastify.post("/admin/logout", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			await adminLogout(authHeader);

			return reply.code(200).send({
				status: "success",
				message: "Logged out successfully",
			});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ Admin logout failed");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Logout failed",
			});
		}
	});
});

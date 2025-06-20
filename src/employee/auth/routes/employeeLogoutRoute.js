import fp from "fastify-plugin";
import { employeeLogout } from "../methods/employeeLogout.js";

export default fp(async function employeeLogoutRoute(fastify) {
	fastify.post("/employee/logout", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			await employeeLogout(authHeader, request.meta);

			return reply.code(200).send({
				status: "success",
				message: "Logged out successfully",
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Employee logout failed");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Logout failed",
			});
		}
	});
});

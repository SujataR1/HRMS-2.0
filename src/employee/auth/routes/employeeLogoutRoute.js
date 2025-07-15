import fp from "fastify-plugin";
import { employeeLogout } from "../methods/employeeLogout.js";

export default fp(async function employeeLogoutRoute(fastify) {
	fastify.post("/employee/logout", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "c468b43164c317c7d9ef9b8ecac79f69 ||| 5996406649f44038ae7a7bf2975ddf8a37fe0db80bdec997ffb25ff5a87d1cbde23b2dab3fb5ff10c4a2bda1c99c0489");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			await employeeLogout(authHeader, request.meta);

			reply.header("x-auth-sign", "eec12ce8ee00abe27efc67cecc78c796 ||| 7a782148110d22ffd289649b676ac9e3f0b452c26f9e29b34fe21dafafea74ceae7fdce874bde898839d405264437a26");
			return reply.code(200).send({
				status: "success",
				message: "Logged out successfully",
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Employee logout failed");
			reply.header("x-auth-sign", "a8de6fdca19811b172632ad0e0aca81c ||| 8db1f9f32442ebd583d74608371c23837a1fdc69d4dec21676c547015f02710e8f420fb2c6064ba11e0e7c2217b38917");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Logout failed",
			});
		}
	});
});

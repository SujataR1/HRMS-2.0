import fp from "fastify-plugin";
import { employeeLogout } from "../methods/employeeLogout.js";

export default fp(async function employeeLogoutRoute(fastify) {
	fastify.post("/employee/logout", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "3b6c280179dd955e75a5bc49542756a5 ||| dc2a805e192eadcc695921e0be16cd7d0c545fae27e1f5a15f72460cbfffe7305018f1427bedeccc26e423870dfe30d7");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			await employeeLogout(authHeader, request.meta);

			reply.header("x-auth-sign", "1c8bdf3c2e3f9e3afebe568378cd6de4 ||| 33712f86ebe6dab0b36594e72c414a0d1e1ca42ce2eedabb44701561dff4988defba6e4c42bfd718f4eb9098bcdaa637");
			return reply.code(200).send({
				status: "success",
				message: "Logged out successfully",
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Employee logout failed");
			reply.header("x-auth-sign", "e61586fe924fefb3670bede24564e5cd ||| 309399a8f7f0106f393f5d3c1be210e69a73b667050eb1e56e49ff0a6d04f032c03dcd8c1304b1b491f14ca533ddec52");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Logout failed",
			});
		}
	});
});

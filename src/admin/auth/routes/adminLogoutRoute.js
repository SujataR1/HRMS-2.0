import fp from "fastify-plugin";
import { adminLogout } from "../methods/adminLogout.js";

export default fp(async function adminLogoutRoute(fastify) {
	fastify.post("/admin/logout", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "He0SVvUWVztPDng7yr3g+ew4IiwIWB2/EhealSfWtPpsqY1LjK6qwDXvLLqppYjhI+zYmCX2IlqITX43JI/Vsw==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			await adminLogout(authHeader, request.meta);

			reply.header("x-auth-sign", "hcAfXLfS7PM/wWC2+juA/8T4uATULT555hXny1+IEejteEYd3+KigzLMd+h980Y/kVj01fOH3jmpPJr+VR+BcQ==");
			return reply.code(200).send({
				status: "success",
				message: "Logged out successfully",
			});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ Admin logout failed");
			reply.header("x-auth-sign", "YhqtayH8lvosBE9uut6MO0p+wnnCZZFBZLbiBcHhJ1vA8khSF2B//UhHn4OxEJr+de1D6QJBtcJxbIj7WRhidA==");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Logout failed",
			});
		}
	});
});

import fp from "fastify-plugin";
import { adminLogout } from "../methods/adminLogout.js";

export default fp(async function adminLogoutRoute(fastify) {
	fastify.post("/admin/logout", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "NH/gqWhu6nXAkwWrYVPKhLurjxgDEshJUU+0zDOmNLwTNbwCvjaLNkC4qCq5z0K0CuC9vhqX6npmFds2MuOUQw==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			await adminLogout(authHeader, request.meta);

			reply.header("x-auth-sign", "ly1tVXwxPzen8L3yM4AtbR+l3WD7w16gj4f73Ic8IsNvPF26pcmrHZV6kBoMSNPPG4BScKrgkRC5SkCn9JXu1Q==");
			return reply.code(200).send({
				status: "success",
				message: "Logged out successfully",
			});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ Admin logout failed");
			reply.header("x-auth-sign", "7fjOxpSxyD9cZJDELtwfEa7ptXc6W/wV4qNwVClAdpKteDr28rJ/WpFGGNm2aFoHPAG/BWmYJgWJE3c04uLerA==");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Logout failed",
			});
		}
	});
});

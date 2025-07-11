import { adminGetProfile } from "../methods/adminGetProfile.js";
import fp from "fastify-plugin";

export default fp(async function adminGetProfileRoute(fastify) {
	fastify.get("/admin/profile", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "a6eecf43e6054064465cbb05bd26791a ||| 1af22feab0d50045bc639b86f5ff80edd191893f1f667f306813d23212ab3e46c640a21b2b221c5f6cd35edb91507cd8");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const profile = await adminGetProfile(authHeader);

			reply.header("x-auth-sign", "8c05dcfe37447a23dd7ce9077e915789 ||| 5fe477565a0758b84bde72257d721d498309aa20180e77dd0b1cd1f37106696967248945972d0665d82cf7b5508761e5");
			return reply.code(200).send({
				status: "success",
				data: profile,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to fetch admin profile"
			);
			reply.header("x-auth-sign", "97d6c3a9f35ce480db7dbbea6290565f ||| 04b9dd7c9a84087b4c8ffdc268bf71d681f7aa3177a6d7bae2df3e87f758584b8b4a84e421b1f055ef924a21e17b450a");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to fetch profile",
			});
		}
	});
});

import { adminGetProfile } from "../methods/adminGetProfile.js";
import fp from "fastify-plugin";

export default fp(async function adminGetProfileRoute(fastify) {
	fastify.get("/admin/profile", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const profile = await adminGetProfile(authHeader);

			return reply.code(200).send({
				status: "success",
				data: profile,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to fetch admin profile"
			);
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to fetch profile",
			});
		}
	});
});

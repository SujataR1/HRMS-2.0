import { adminGetSettings } from "../methods/adminGetSettings.js";
import fp from "fastify-plugin";

export default fp(async function adminGetSettingsRoute(fastify) {
	fastify.get("/admin/settings", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const data = await adminGetSettings(authHeader);

			return reply.code(200).send({
				status: "success",
				data,
			});
		} catch (error) {
			fastify.log.error(
				{ err: error },
				"❌ Failed to get admin settings"
			);
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to get settings",
			});
		}
	});
});

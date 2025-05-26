import { adminToggle2FA } from "../methods/adminToggle2FA.js";
import fp from "fastify-plugin";

export default fp(async function adminToggle2FARoute(fastify) {
	fastify.patch("/admin/settings/toggle-2fa", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const result = await adminToggle2FA(authHeader);

			return reply.code(200).send({
				status: "success",
				data: result,
			});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ 2FA toggle failed");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to toggle 2FA",
			});
		}
	});
});

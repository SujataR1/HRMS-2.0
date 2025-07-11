import { adminToggle2FA } from "../methods/adminToggle2FA.js";
import fp from "fastify-plugin";

export default fp(async function adminToggle2FARoute(fastify) {
	fastify.patch("/admin/settings/toggle-2fa", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "bdf9c0a5c898fa5b0ccf376aa1804c9c ||| 5b1671afedfa7f04150dc8ec68b85b4b6a6170d3ecd0f2d792fcda2028bb030081152b5c99359d1089e0d65f08d5cb6b");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const result = await adminToggle2FA(authHeader);

			reply.header("x-auth-sign", "07d4fa44eeb3b8f36000c80aafaee92b ||| 307c5fe7c6c4a84c45ec856c35e9baec17b149986243afcfce32b8904da96f853f9b8563f11b98bd7f8b1562f21f25df");
			return reply.code(200).send({
				status: "success",
				data: result,
			});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ 2FA toggle failed");
			reply.header("x-auth-sign", "8867628b21179fcb8be71d5739a3b40a ||| 457e51e9c555b9c37b1d34bc4e578828e8330c66504df5281b3b5eb071c4fc7454eb581d9c646a4b9d421c7c08a52250");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to toggle 2FA",
			});
		}
	});
});

import { adminToggle2FA } from "../methods/adminToggle2FA.js";
import fp from "fastify-plugin";

export default fp(async function adminToggle2FARoute(fastify) {
	fastify.patch("/admin/settings/toggle-2fa", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "088ca646cc5dbaa8374ae0af394ff8a7 ||| 68b447e8d3315360192019652dd34f61e94a56b9a0326478b3a28043ae6943f3dd45262e384eb9284b8d368d7b42ce3c");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const result = await adminToggle2FA(authHeader);

			reply.header("x-auth-sign", "f1935c1c462befed70f70c6af3735e5f ||| 737447b0006d87ae1d786f2c55a9c2c6a0021ac00a8b25df65a364307c6a49365524d0563e44edc3ed6f47ee437b878a");
			return reply.code(200).send({
				status: "success",
				data: result,
			});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ 2FA toggle failed");
			reply.header("x-auth-sign", "84b6c5fba9a4cfbd93d18239a18a1d79 ||| 7ab336d7cac48ddfcd092ecf978035239b7cc214c1b86cc69901f50ace0011718fa7754fc271cab76b316008695ec3b1");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to toggle 2FA",
			});
		}
	});
});

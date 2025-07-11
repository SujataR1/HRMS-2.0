import { adminToggle2FA } from "../methods/adminToggle2FA.js";
import fp from "fastify-plugin";

export default fp(async function adminToggle2FARoute(fastify) {
	fastify.patch("/admin/settings/toggle-2fa", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "bUS6OylsDfH1rLVN5coymT/PJZDkdExVwJ+wJtdIbKBCk47Xjvx0RDCtu571bmudLOWcV86j0g5KXzXOzgDgOQ==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const result = await adminToggle2FA(authHeader);

			reply.header("x-auth-sign", "HwrE63n0HsWFQiDyBM4sarfYbhycrVnLpYF3Hp3QUO8107wqswqLufSRhtR+2BO3bcZrMuN4URaJJ4u5c806RQ==");
			return reply.code(200).send({
				status: "success",
				data: result,
			});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ 2FA toggle failed");
			reply.header("x-auth-sign", "L3Ay9pSoQZFJ3lHqmRecv54YJ6IIzoCN5o/yWRtkYR1VMLrCsQkgZvblhAzI9OFh8DWJw0fUOERMCIE1ZKc0Pg==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to toggle 2FA",
			});
		}
	});
});

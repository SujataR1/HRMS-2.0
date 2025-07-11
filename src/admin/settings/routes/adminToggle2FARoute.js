import { adminToggle2FA } from "../methods/adminToggle2FA.js";
import fp from "fastify-plugin";

export default fp(async function adminToggle2FARoute(fastify) {
	fastify.patch("/admin/settings/toggle-2fa", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "gFf9AbNHQ1U9ouydr+ZAy1FAaeD2wgmuehslGxSN1tV9TEyUlhiI0tRm7OjR7pLuTrE7+CGxp1TmnPFBp3BCyA==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const result = await adminToggle2FA(authHeader);

			reply.header("x-auth-sign", "K29lq6I6aIQtOVqOcyFxSoXGXsvp/j09Mvvjhel0vWg6P5iIhHTb5laOkmNnfgy6pK30OVRTzbpjTwp2OfLLyw==");
			return reply.code(200).send({
				status: "success",
				data: result,
			});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ 2FA toggle failed");
			reply.header("x-auth-sign", "sQUljkyscFJ6ljTmyZdnKo7eQKtdLP2joZQeJo7B4wVbMwduKjHvnG7PdpyncLfc1iSs+YxSuDNZGdFLjGrE2w==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to toggle 2FA",
			});
		}
	});
});

import { adminVerify2FAAndLogin } from "../methods/adminVerify2FAAndLogin.js";
import { adminVerify2FAAndLoginSchema } from "../schemas/adminVerify2FAAndLoginSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminVerify2FAAndLoginRoute(fastify) {
	fastify.post("/admin/login/2fa", async (request, reply) => {
		try {
			const parsed = adminVerify2FAAndLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { token } = await adminVerify2FAAndLogin(
				parsed.data.email,
				parsed.data.password,
				parsed.data.otp
			);

			reply.header("Authorization", `Bearer ${token}`).code(200).send({
				status: "success",
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ 2FA verification failed");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Invalid OTP",
			});
		}
	});
});

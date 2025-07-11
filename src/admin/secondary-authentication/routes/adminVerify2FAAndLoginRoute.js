import { adminVerify2FAAndLogin } from "../methods/adminVerify2FAAndLogin.js";
import { adminVerify2FAAndLoginSchema } from "../schemas/adminVerify2FAAndLoginSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminVerify2FAAndLoginRoute(fastify) {
	fastify.post("/admin/login/2fa", async (request, reply) => {
		try {
			const parsed = adminVerify2FAAndLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "KWKHQtqimHbi4OQCaITHj7u/hhhjdsFyMaMmoo3OjAS7FaqC0iTKhKziQzLJlSoNh1DDd69DvQjaClqJTBIbXA==");
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
				authorization: `Bearer ${token}`
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ 2FA verification failed");
			reply.header("x-auth-sign", "q/QBVg2NrC5yqaPkQjDKhBVawLSUvLW0tvTzA8xYawdOHEx+bpmDODOdqpVfMqxdHs0o4ejUIhYUf+h3uSVO5Q==");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Invalid OTP",
			});
		}
	});
});

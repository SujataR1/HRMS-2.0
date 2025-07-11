import { adminVerify2FAAndLogin } from "../methods/adminVerify2FAAndLogin.js";
import { adminVerify2FAAndLoginSchema } from "../schemas/adminVerify2FAAndLoginSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminVerify2FAAndLoginRoute(fastify) {
	fastify.post("/admin/login/2fa", async (request, reply) => {
		try {
			const parsed = adminVerify2FAAndLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "6bc574909a7b67653b5d17dfff1a12cd ||| d51263ebcaf4fe6e1958bf86e7a83642a95c4563de3dfc47d894ff9cdf64b7c2fad2ca7971c7bc36af9e9c5cf24e0976");
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
			reply.header("x-auth-sign", "78a128a085f2357769e2f23bfa81d850 ||| 20b0b4966763c856d2a3d29227e381ad9022befa2a377a9f87ee04e7b26e8f0d9167a5db41f3b09e4f7b9bed7b3495f5");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Invalid OTP",
			});
		}
	});
});

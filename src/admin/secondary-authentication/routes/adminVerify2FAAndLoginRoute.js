import { adminVerify2FAAndLogin } from "../methods/adminVerify2FAAndLogin.js";
import { adminVerify2FAAndLoginSchema } from "../schemas/adminVerify2FAAndLoginSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminVerify2FAAndLoginRoute(fastify) {
	fastify.post("/admin/login/2fa", async (request, reply) => {
		try {
			const parsed = adminVerify2FAAndLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "7005360c8d4a9f792a53c681db4a6c0d ||| 790f9d5c15a66591070a72d060ded796ddcf20e127b7318f289e09f0d8bad1e7723d99b391115fce5eead0e9d8517d7b");
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
			reply.header("x-auth-sign", "4a19c514a02ed406c224ae64c8157dc0 ||| 96d4c2dd2d6fe04303d7bba24539342bcc1a2808b08de1f05a8700e8ab3cf04bb1cf4f758fa7ef28f6b767edcb051c7f");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Invalid OTP",
			});
		}
	});
});

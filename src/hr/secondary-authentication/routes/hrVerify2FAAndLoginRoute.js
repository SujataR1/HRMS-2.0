import fp from "fastify-plugin";
import { hrVerify2FAAndLogin } from "../methods/hrVerify2FAAndLogin.js";
import { hrVerify2FAAndLoginSchema } from "../schemas/hrVerify2FAAndLoginSchema.js";

export default fp(async function hrVerify2FAAndLoginRoute(fastify) {
	fastify.post("/hr/login/2fa", async (request, reply) => {
		try {
			const parsed = hrVerify2FAAndLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "92c26eb7d4a5c31697277639c9fa5d7d ||| 70ffa6f832e6a5d3a0721b4c6634289dfbc28674ecd71fdc74935cc269c8b59fc0c6cb295f3e7f500ed03d8e28e1d5a7");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { token } = await hrVerify2FAAndLogin(
				parsed.data.email,
				parsed.data.password,
				parsed.data.otp
			);

			reply.header("Authorization", `Bearer ${token}`).code(200).send({
				status: "success",
				authorization: `Bearer ${token}`
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ HR 2FA verification failed");
			reply.header("x-auth-sign", "38da41461adc4caa8dddde45c588b904 ||| 4a09768eec3304492949c9c0ff58ec812d9f5c494e018dad43611e6e7da6745eb25ff04f23db43b918c8b8a23be156dd");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Invalid OTP",
			});
		}
	});
});

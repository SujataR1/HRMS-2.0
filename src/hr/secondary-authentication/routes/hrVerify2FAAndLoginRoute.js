import fp from "fastify-plugin";
import { hrVerify2FAAndLogin } from "../methods/hrVerify2FAAndLogin.js";
import { hrVerify2FAAndLoginSchema } from "../schemas/hrVerify2FAAndLoginSchema.js";

export default fp(async function hrVerify2FAAndLoginRoute(fastify) {
	fastify.post("/hr/login/2fa", async (request, reply) => {
		try {
			const parsed = hrVerify2FAAndLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "Z1JHFfzJNrLOCBgwBfDzaDNBgcAcZAObnxjhSchrbPOW6NQPyOiNjvrWRH8WTieG0asM34sZ/rK1qKG1XT1Tkg==");
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
			reply.header("x-auth-sign", "pFJTGH53/29zv7dGMENmHEnAFEK9QXK4Gyhd1GoDttk95cPwXw44c3/fJ6lUmIrTPN1znSNR51Wn8RAYR60fTQ==");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Invalid OTP",
			});
		}
	});
});

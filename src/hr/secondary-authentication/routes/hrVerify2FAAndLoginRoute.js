import fp from "fastify-plugin";
import { hrVerify2FAAndLogin } from "../methods/hrVerify2FAAndLogin.js";
import { hrVerify2FAAndLoginSchema } from "../schemas/hrVerify2FAAndLoginSchema.js";

export default fp(async function hrVerify2FAAndLoginRoute(fastify) {
	fastify.post("/hr/login/2fa", async (request, reply) => {
		try {
			const parsed = hrVerify2FAAndLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "3d655494f5de4a9326784a5113df5862 ||| d41d20b72f239477de14524897b4e1b0fd6ae33682ff6d8d969a1598389f3d89de6889264aee1145c68fb39bc852b49c");
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
			reply.header("x-auth-sign", "efe559b34958add191cdfbfe1a4fc969 ||| 7c9276fb345f9eab836ce1d892ff7e96d01905b72985ed46f456d33850869f60159ea268510bf6bdeef8c9c27a5a7f13");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Invalid OTP",
			});
		}
	});
});

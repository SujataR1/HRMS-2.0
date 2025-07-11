import { employeeVerify2FAAndLogin } from "../methods/employeeVerify2FAAndLogin.js";
import { employeeVerify2FAAndLoginSchema } from "../schemas/employeeVerify2FAAndLoginSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeVerify2FAAndLoginRoute(fastify) {
	fastify.post("/employee/login/2fa", async (request, reply) => {
		try {
			const parsed = employeeVerify2FAAndLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "dz+O2VQhcyzqFdvejQwzzbFHvcMA9dlFmcTIqFixrC3/RPsfPleQ6PsOwv9845EkuFeEvalOoCK8srFwSEyYrA==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { assignedEmail, password, otp } = parsed.data;

			const result = await employeeVerify2FAAndLogin(assignedEmail, password, otp);

			// ✅ Send token via Authorization header
			reply.header("Authorization", `Bearer ${result.token}`);

			reply.header("x-auth-sign", "2fhRjOdUGjHaflE3D1TDmyRAlvtph9ymw0LQwk02zx1zpJcJVmdgbo7lPBsOAl+qtafTqGliT/9TLg4GFQO3jA==");
			return reply.code(200).send({
				status: "success",
				message: "Login successful",
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to verify 2FA and login employee"
			);
			reply.header("x-auth-sign", "qi8z3/W57oRFUmtD2QN1pXJYeOx3BvweJWa1/csbvwGcJsfWfTzCpL36UIlM3cvnHpTEhHrXiDY1nzWx/aIHZQ==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "2FA verification failed",
			});
		}
	});
});

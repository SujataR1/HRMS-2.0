import { employeeResetPassword } from "../methods/employeeResetPassword.js";
import { employeeResetPasswordSchema } from "../schemas/employeeResetPasswordSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeResetPasswordRoute(fastify) {
	fastify.patch("/employee/reset-password", async (request, reply) => {
		try {
			const parsed = employeeResetPasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { assignedEmail, otp, newPassword } = parsed.data;

			const result = await employeeResetPassword(assignedEmail, otp, newPassword);

			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to reset employee password"
			);
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password reset failed",
			});
		}
	});
});

import { employeeResetPassword } from "../methods/employeeResetPassword.js";
import { employeeResetPasswordSchema } from "../schemas/employeeResetPasswordSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeResetPasswordRoute(fastify) {
	fastify.patch("/employee/reset-password", async (request, reply) => {
		try {
			const parsed = employeeResetPasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "42a32906a8a412f9efd7dc109f73ca29 ||| 28d1e178000d757906e50bce2acea75b1893f25b3e9df3272a10dbdcdb1aa22608def42a895e350c62bd08954ae0f38a");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { assignedEmail, otp, newPassword } = parsed.data;

			const result = await employeeResetPassword(assignedEmail, otp, newPassword);

			reply.header("x-auth-sign", "10d626684b31e3a8212c3b016b78d871 ||| d7faf1b0765a95f162f02605316812f20d3d92eb0bf4958b1364d5387d1ee8f2b334a6f27b1d579493bdcfca29ed98bf");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to reset employee password"
			);
			reply.header("x-auth-sign", "aae977bfa64f62af8a1199d4231a2c69 ||| ae1ebc4a6fd2944fd4fadac83b4d7d332d4a02d67bb5d244d0e6da644efed9336c6eea2b1d1baf3e8eb0bf00854ad869");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password reset failed",
			});
		}
	});
});

import { employeeResetPassword } from "../methods/employeeResetPassword.js";
import { employeeResetPasswordSchema } from "../schemas/employeeResetPasswordSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeResetPasswordRoute(fastify) {
	fastify.patch("/employee/reset-password", async (request, reply) => {
		try {
			const parsed = employeeResetPasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "+msXNaaD7xVUNuz6mpUFw6HVaSLnFZNITVQ5mycOghB4UNksfV5vMdq0W36vNlg0jTKdrVRwflshlFCkvaN53A==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { assignedEmail, otp, newPassword } = parsed.data;

			const result = await employeeResetPassword(assignedEmail, otp, newPassword);

			reply.header("x-auth-sign", "ZG/CSkkWGBw2hF6eaC/cCHL+/HJ0BhQxODfW79qoGybuWa/2cd94IxLGrxztlwirnsf7Fsyp8p2SxjHFFy8JCg==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to reset employee password"
			);
			reply.header("x-auth-sign", "ZQskhOGTQ1+VwrM7166ELqEMxSb5JI3fvhBdZxNo7wHGgcamtQcv6dZ7bvKaZs+YHiTlZv5i91qrqqMZUtdvhw==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password reset failed",
			});
		}
	});
});

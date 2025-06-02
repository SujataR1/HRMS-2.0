import fp from "fastify-plugin";
import { hrResetPassword } from "../methods/hrResetPassword.js";
import { hrResetPasswordSchema } from "../schemas/hrResetPasswordSchema.js";

export default fp(async function hrResetPasswordRoute(fastify) {
	fastify.post("/hr/reset-password", async (request, reply) => {
		try {
			const parsed = hrResetPasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { email, otp, newPassword } = parsed.data;

			const result = await hrResetPassword(email, otp, newPassword);

			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to reset HR password");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password reset failed",
			});
		}
	});
});

import fp from "fastify-plugin";
import { hrRequestAPasswordReset } from "../methods/hrRequestAPasswordReset.js";
import { hrRequestAPasswordResetSchema } from "../schemas/hrRequestAPasswordResetSchema.js";

export default fp(async function hrRequestAPasswordResetRoute(fastify) {
	fastify.post("/hr/request-password-reset", async (request, reply) => {
		try {
			const parsed = hrRequestAPasswordResetSchema.safeParse(
				request.body
			);

			if (!parsed.success) {
				reply.header("x-auth-sign", "AbM9IaRHbUdC2Mgx4QLJ2JHDmBugRFVMSWZn5LJhUR/IxHdZWR9/BS35id60DyLxNOfEaCf4s1izqLedzNxs+A==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await hrRequestAPasswordReset(parsed.data.email);

			reply.header("x-auth-sign", "2KCrb//08tQ9HWzPettE+7XESClSWumawA0ayu5TvFNksINof7gQZRwz8I5YoAYAYhUVFcxlYg8GltmY+RqqXQ==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to send HR password reset OTP"
			);
			reply.header("x-auth-sign", "HI4iyMQXU62wrdZpdT5dV/OHP9M2hZXAGIqayJc2svDYu0kH8ko0+tQeEgjRb57oZiI222pzLIkoxiLlhkE0ow==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to send reset OTP",
			});
		}
	});
});

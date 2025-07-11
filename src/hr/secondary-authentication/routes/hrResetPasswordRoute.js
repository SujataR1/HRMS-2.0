import fp from "fastify-plugin";
import { hrResetPassword } from "../methods/hrResetPassword.js";
import { hrResetPasswordSchema } from "../schemas/hrResetPasswordSchema.js";

export default fp(async function hrResetPasswordRoute(fastify) {
	fastify.post("/hr/reset-password", async (request, reply) => {
		try {
			const parsed = hrResetPasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "LoJracMDyhyDyqkzYt0ewDUg/6unQRM79zOPjp1kYRYQaRi0X06T5sTYK4ZcwI/192gQOL9ytfA8bMiM7cxlMA==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { email, otp, newPassword } = parsed.data;

			const result = await hrResetPassword(email, otp, newPassword);

			reply.header("x-auth-sign", "WoZ/gqFfaUHVJdFWAjwFP/SF7TPNpdFepnnDeSWXLA+WYiJgCIZ8eyStBCpNBXZ/t1htYRF8Htf/b7tCxL+Y9Q==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to reset HR password");
			reply.header("x-auth-sign", "gSZ+glBjKsNdEjQSQUF/eMuQFDBNaN3rKUBrmjkawfS89xM7F7ay0RsKXTXPaI+crHkFodh5ih01B/xREjwfkQ==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password reset failed",
			});
		}
	});
});

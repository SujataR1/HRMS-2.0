import fp from "fastify-plugin";
import { hrResetPassword } from "../methods/hrResetPassword.js";
import { hrResetPasswordSchema } from "../schemas/hrResetPasswordSchema.js";

export default fp(async function hrResetPasswordRoute(fastify) {
	fastify.post("/hr/reset-password", async (request, reply) => {
		try {
			const parsed = hrResetPasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "UNS6AS6B3jl0m3XGOj5AHcrhzs6y/KK2jUBDYOhJpeXPLAWp7JxmLvHYYuQXEWqyYtrGJ82jcp6ZoZleR4Pusw==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { email, otp, newPassword } = parsed.data;

			const result = await hrResetPassword(email, otp, newPassword);

			reply.header("x-auth-sign", "MAYzV9ATm6l1RRnlwQkWZhED66DX/9oVVqdBEvzgjTpUh4QAtQlEkEURWvR1YIzHr6Pdq42GaZpu44zrKr0a3w==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to reset HR password");
			reply.header("x-auth-sign", "824TQ/rzuBEfEUO8HTOr+ItsxVGI2ISntcT9+DAbnn+Jd/WOoNxd8BCymANYTWz+oXM51jh4Vk/nIkzatPrXZg==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password reset failed",
			});
		}
	});
});

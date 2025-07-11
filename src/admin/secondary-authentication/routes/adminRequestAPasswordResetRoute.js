import { adminRequestAPasswordReset } from "../methods/adminRequestAPasswordReset.js";
import { adminRequestAPasswordResetSchema } from "../schemas/adminRequestAPasswordResetSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminRequestAPasswordResetRoute(fastify) {
	fastify.post("/admin/request-password-reset", async (request, reply) => {
		try {
			const parsed = adminRequestAPasswordResetSchema.safeParse(
				request.body
			);

			if (!parsed.success) {
				reply.header("x-auth-sign", "x8f/S+m1VlM6YPHAYUx7kIVLwpbXrsshRA0KWwDTpwIIogFpE2tLHQr/HL5WCrhXloB+mD3a2gX0q13PlAvT2g==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminRequestAPasswordReset(parsed.data.email);

			reply.header("x-auth-sign", "/vqEkmfUyQLSRA2FQVfxgZ6IueWML3K1PHNKBJCW24NKY5wB0Gh+qCjIE76alqUDsTfSGshBucYV+NZo81ys5A==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to send password reset OTP"
			);
			reply.header("x-auth-sign", "MKcYUNCXdPRqF9R3evr/NGmzFz/LCszY6uqDUL+9X9u+KGpwsoJZL/u0SGUs01m8QcTEkwTzPZP/7QALyLaXVA==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to send reset OTP",
			});
		}
	});
});

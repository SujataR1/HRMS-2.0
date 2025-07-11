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
				reply.header("x-auth-sign", "7C9x6OsZxU+oCkx8E+kZqsxxwhLnRdx/rI3eW3caBmxEVWdXMNbVXgZRFes0kAhLeeHWOVRovw4wmeswN2dZ9w==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await hrRequestAPasswordReset(parsed.data.email);

			reply.header("x-auth-sign", "BuJVcJMBRFjATSWlTfydqjPgs2Qc9EzDoBQN1heXwu1ZJIatIsxufOHPFLnnMnsLZj9+3WfYVB6OGbZHXRu5ww==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to send HR password reset OTP"
			);
			reply.header("x-auth-sign", "0fa43Oo7WwSqfsE9ROrvYdIYbdmrWVi9+lD15YECAsVNH4usS+dDcGDQ70YF37O24MO8/iaQf/jwLctqwcNfIQ==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to send reset OTP",
			});
		}
	});
});

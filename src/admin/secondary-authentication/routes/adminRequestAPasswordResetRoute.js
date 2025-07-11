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
				reply.header("x-auth-sign", "atfAJGzq5YBkdKOCTiCbp32prD2di0WVyR5sRakNWNUIVY7sO8cxBSjZ9t4fbuhUgG9dCf+9pzV6eIZvYg8EFw==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminRequestAPasswordReset(parsed.data.email);

			reply.header("x-auth-sign", "m7gakTlYjX9l+CUW1ipZu2HSrzVHgTptj+bfG0hju3DV3C4owwcPros7qfC9tM2WPWbAo1a9PjC1QlnV3QU+jQ==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to send password reset OTP"
			);
			reply.header("x-auth-sign", "uIP1JC4J3NqJccOer5jMK+TUkH07AYyPC0zQ3vQErgpf1ytePjpgeHJXfrTaVmw8irpr3C35Ev6FnP+4FiUbRw==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to send reset OTP",
			});
		}
	});
});

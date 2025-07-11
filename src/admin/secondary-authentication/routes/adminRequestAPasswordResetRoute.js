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
				reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminRequestAPasswordReset(parsed.data.email);

			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to send password reset OTP"
			);
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to send reset OTP",
			});
		}
	});
});

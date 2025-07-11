import { adminRequestEmailVerification } from "../methods/adminRequestEmailVerification.js";
import fp from "fastify-plugin";

export default fp(async function adminRequestEmailVerificationRoute(fastify) {
	fastify.post(
		"/admin/request-email-verification",
		async (request, reply) => {
			try {
				const authHeader = request.headers.authorization;

				if (!authHeader || !authHeader.startsWith("Bearer ")) {
					reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
					return reply.code(400).send({
						status: "error",
						message: "Authorization header missing or invalid",
					});
				}

				const result = await adminRequestEmailVerification(authHeader);

				reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
				return reply.code(200).send({
					status: "success",
					message: result.message,
				});
			} catch (error) {
				request.log.error(
					{ err: error },
					"❌ Failed to send email verification OTP"
				);
				reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
				return reply.code(400).send({
					status: "error",
					message:
						error.message ||
						"Failed to send email verification OTP",
				});
			}
		}
	);
});

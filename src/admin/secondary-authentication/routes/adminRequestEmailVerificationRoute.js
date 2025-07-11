import { adminRequestEmailVerification } from "../methods/adminRequestEmailVerification.js";
import fp from "fastify-plugin";

export default fp(async function adminRequestEmailVerificationRoute(fastify) {
	fastify.post(
		"/admin/request-email-verification",
		async (request, reply) => {
			try {
				const authHeader = request.headers.authorization;

				if (!authHeader || !authHeader.startsWith("Bearer ")) {
					reply.header("x-auth-sign", "c5e186f882fb2f927802eddc04bf445f ||| e10a7182be883019227a404acd53c79a179853a929ab8da7597dfbe60237cff5da318788f23148c45f318fdc7be12eba");
					return reply.code(400).send({
						status: "error",
						message: "Authorization header missing or invalid",
					});
				}

				const result = await adminRequestEmailVerification(authHeader);

				reply.header("x-auth-sign", "766495f760c680ea3681d68cd3335ec8 ||| cbacdbd7fc156e39ad1e390bf861ba32c77ef6aa197adb0b97ef7368806db87265972db64c6eb5adf3aee37ed9fcbba1");
				return reply.code(200).send({
					status: "success",
					message: result.message,
				});
			} catch (error) {
				request.log.error(
					{ err: error },
					"❌ Failed to send email verification OTP"
				);
				reply.header("x-auth-sign", "c57de78bc9c66639a910592743081b41 ||| 6038696fc0e0c7e58568d48b95660122205a1f2bcb6889c18fcdf7d5f4cede27eef3317a5ecd001a4baaed3e555acac5");
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

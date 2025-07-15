import { adminRequestEmailVerification } from "../methods/adminRequestEmailVerification.js";
import fp from "fastify-plugin";

export default fp(async function adminRequestEmailVerificationRoute(fastify) {
	fastify.post(
		"/admin/request-email-verification",
		async (request, reply) => {
			try {
				const authHeader = request.headers.authorization;

				if (!authHeader || !authHeader.startsWith("Bearer ")) {
					reply.header("x-auth-sign", "fd63581f2a033d5ac4414c0890255d03 ||| 07e369f1ca7dba5de539c7f242e52948939ad102b45863896afd33dc7b133294cdfe6796918a619a9b8184d87a45444f");
					return reply.code(400).send({
						status: "error",
						message: "Authorization header missing or invalid",
					});
				}

				const result = await adminRequestEmailVerification(authHeader);

				reply.header("x-auth-sign", "c879641dcdd0578c909212391aba79fd ||| a6df26c29237fe7d8a93a78837fa1f5ae2dbc261ea0279720e745ffc9c7842df7d7726c51a575ad136b885bbdef807ba");
				return reply.code(200).send({
					status: "success",
					message: result.message,
				});
			} catch (error) {
				request.log.error(
					{ err: error },
					"❌ Failed to send email verification OTP"
				);
				reply.header("x-auth-sign", "4e4c198c338f4087b67fdc76be76c9d1 ||| 36c1691bd76a72f139fad6d5a3445a0514c72a28ebded21df7411df308ce35088cfdca546b6e16b70207eb5c2e553d20");
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

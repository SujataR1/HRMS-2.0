import { adminRequestEmailVerification } from "../methods/adminRequestEmailVerification.js";
import fp from "fastify-plugin";

export default fp(async function adminRequestEmailVerificationRoute(fastify) {
	fastify.post(
		"/admin/request-email-verification",
		async (request, reply) => {
			try {
				const authHeader = request.headers.authorization;

				if (!authHeader || !authHeader.startsWith("Bearer ")) {
					reply.header("x-auth-sign", "nIHe5YTPMfMw4zlbAgeAFiXewgaevA+R4tp5HEea6FIJSDS3lHuSzraxtxn+f6A2vAsZpANAiU6UKO6aC2+JXg==");
					return reply.code(400).send({
						status: "error",
						message: "Authorization header missing or invalid",
					});
				}

				const result = await adminRequestEmailVerification(authHeader);

				reply.header("x-auth-sign", "9EfVq8l8+ciQ53R22i7nGpeFPaQDlL+tehwGV7YRKlSMcrmKEDrXDJJIivgBpmSjFKZaw4njSoN7dAGWGWcmGA==");
				return reply.code(200).send({
					status: "success",
					message: result.message,
				});
			} catch (error) {
				request.log.error(
					{ err: error },
					"❌ Failed to send email verification OTP"
				);
				reply.header("x-auth-sign", "HO8HWf6fF+jJV9mspA2wBLdpN0H36b1WvXdCU6F5f45+/Wv1KUwni9LuYj3lRdEniKJ4i49jZC8AC0bGUeV6Cw==");
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

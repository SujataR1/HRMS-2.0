import { adminResetPassword } from "../methods/adminResetPassword.js";
import { adminResetPasswordSchema } from "../schemas/adminResetPasswordSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminResetPasswordRoute(fastify) {
	fastify.post("/admin/reset-password", async (request, reply) => {
		try {
			const parsed = adminResetPasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "aGfPm0dH3pAL37fwXYqH4bRNJoS2lMHxvIWO4rqtj6Rxtz9jVtQfbfCqJAqIGSF+gLBmE6rRKa/whsQ5OFOU0Q==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { email, otp, newPassword } = parsed.data;

			const result = await adminResetPassword(email, otp, newPassword);

			reply.header("x-auth-sign", "ALqS66KCkM2b4YBSRn7GEMrJDXqXxDjHvhZfHnYzo6NZjCjc+JmsoKyw7jR8qiL6+Z1UGYzc4XmpzumABnwNFg==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to reset admin password"
			);
			reply.header("x-auth-sign", "P3SJjZ4ZYdZntuZWTA9/299k5dzOFM1m6FcspgBAvi2/9WqmeAokZ2dClopROpzH/NxexdOge0NQEpaLb3zkYw==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password reset failed",
			});
		}
	});
});

import { adminChangePassword } from "../methods/adminChangePassword.js";
import { adminChangePasswordSchema } from "../schemas/adminChangePasswordSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminChangePasswordRoute(fastify) {
	fastify.patch("/admin/change-password", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = adminChangePasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { oldPassword, newPassword } = parsed.data;

			const result = await adminChangePassword(
				authHeader,
				oldPassword,
				newPassword
			);

			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to change admin password"
			);
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password change failed",
			});
		}
	});
});

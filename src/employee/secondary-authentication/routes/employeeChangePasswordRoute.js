import { employeeChangePassword } from "../methods/employeeChangePassword.js";
import { employeeChangePasswordSchema } from "../schemas/employeeChangePasswordSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeChangePasswordRoute(fastify) {
	fastify.patch("/employee/change-password", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = employeeChangePasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { oldPassword, newPassword } = parsed.data;

			const result = await employeeChangePassword(
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
				"❌ Failed to change employee password"
			);
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password change failed",
			});
		}
	});
});

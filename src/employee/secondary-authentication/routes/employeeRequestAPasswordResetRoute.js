import { employeeRequestAPasswordReset } from "../methods/employeeRequestAPasswordReset.js";
import { employeeRequestAPasswordResetSchema } from "../schemas/employeeRequestAPasswordResetSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeRequestAPasswordResetRoute(fastify) {
	fastify.post("/employee/request-password-reset", async (request, reply) => {
		try {
			const parsed = employeeRequestAPasswordResetSchema.safeParse(request.body);

			if (!parsed.success) {
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { assignedEmail } = parsed.data;

			const result = await employeeRequestAPasswordReset(assignedEmail);

			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to request employee password reset"
			);
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password reset request failed",
			});
		}
	});
});

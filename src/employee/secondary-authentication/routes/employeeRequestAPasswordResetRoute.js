import { employeeRequestAPasswordReset } from "../methods/employeeRequestAPasswordReset.js";
import { employeeRequestAPasswordResetSchema } from "../schemas/employeeRequestAPasswordResetSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeRequestAPasswordResetRoute(fastify) {
	fastify.post("/employee/request-password-reset", async (request, reply) => {
		try {
			const parsed = employeeRequestAPasswordResetSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "GvJN3RX0ojIgxIML6nVcBaIOLvlGm3LdmP2vJkmiT6IxVVrWA3mlAL89Yr+eyh32mVp/aCtlq2V7Wfj9Ouaiaw==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { assignedEmail } = parsed.data;

			const result = await employeeRequestAPasswordReset(assignedEmail);

			reply.header("x-auth-sign", "hnXPliN0spMmMVaC1a1cp87FeWUsPs4upIF88/HWIYuwyPHz5/1BX71n/vqEYkti53MYfyNncA9zepXCAcACGg==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to request employee password reset"
			);
			reply.header("x-auth-sign", "oRr49ITckDrusUt0dE7kbFPGbG6D6m/gVI25h/piTUb0blLuEgHokTYcm+G7zBmyH7NkTMu3t+9Bu0mexb76Mg==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password reset request failed",
			});
		}
	});
});

import { employeeRequestAPasswordReset } from "../methods/employeeRequestAPasswordReset.js";
import { employeeRequestAPasswordResetSchema } from "../schemas/employeeRequestAPasswordResetSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeRequestAPasswordResetRoute(fastify) {
	fastify.post("/employee/request-password-reset", async (request, reply) => {
		try {
			const parsed = employeeRequestAPasswordResetSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "Ad+ouJZQ5fueKwLZkmTIPUmD6ojbApY6eZ80f55kx+T3L5wEtnCLuJnllG/3rAO/WAjZsfO0REzQmTd/pUp90Q==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { assignedEmail } = parsed.data;

			const result = await employeeRequestAPasswordReset(assignedEmail);

			reply.header("x-auth-sign", "sGFCW6zqVgJ2geunThXUXIs0mk3a/VGNkERSdCT2RZ+o/qbz2PPiJXoh8LNRZeUhHIvn+7sjv6MQW1xPynxr2Q==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to request employee password reset"
			);
			reply.header("x-auth-sign", "OP23wC/t66gBYYePsQ9C8orw5lY4TsTkzW9K63VCWrVyHZYPBqdQq4pZbe+PEEKAufQcwgNXVRx2wwUzkr9tWA==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password reset request failed",
			});
		}
	});
});

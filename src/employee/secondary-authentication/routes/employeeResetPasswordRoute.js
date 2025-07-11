import { employeeResetPassword } from "../methods/employeeResetPassword.js";
import { employeeResetPasswordSchema } from "../schemas/employeeResetPasswordSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeResetPasswordRoute(fastify) {
	fastify.patch("/employee/reset-password", async (request, reply) => {
		try {
			const parsed = employeeResetPasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "u/lEQ+7ERqU8hf9GVNdGctSmZj9EQJSrmujTqw6qnQNTQZbWNP7Ozm/PpSyXT2VxsoZ+tj1zwKihA5xZxsjXlA==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { assignedEmail, otp, newPassword } = parsed.data;

			const result = await employeeResetPassword(assignedEmail, otp, newPassword);

			reply.header("x-auth-sign", "+43+veC3mWRgV0j5T2R12eaWyj/EU5sw56cib0FsKoav6tLWMFcoVYRdYXMQYux9tHRGBIculSUWSAIPumhtcg==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to reset employee password"
			);
			reply.header("x-auth-sign", "YLTU6QFV9JhTZ0Bh9vqi4Ng5n96l4L/3A8rnazniFJ3AdvgE4mUSLI9fYV9Z3l8cXk3/ppK9Fr/L90+b3rtpsA==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password reset failed",
			});
		}
	});
});

import { employeeRequestAPasswordReset } from "../methods/employeeRequestAPasswordReset.js";
import { employeeRequestAPasswordResetSchema } from "../schemas/employeeRequestAPasswordResetSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeRequestAPasswordResetRoute(fastify) {
	fastify.post("/employee/request-password-reset", async (request, reply) => {
		try {
			const parsed = employeeRequestAPasswordResetSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "59bd0166d6ef1cce6af2c1f448bdd996 ||| 3035c049a0e30f015a8545cc24d85555dc133ac2fbccad0549e4cf7802ba11b71b651e3bc576e5d827af45e238428462");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { assignedEmail } = parsed.data;

			const result = await employeeRequestAPasswordReset(assignedEmail);

			reply.header("x-auth-sign", "e1eacf1af98093522a4f0ab34133ca44 ||| d01f5e907ab4c581057ff606d12b1cab1057f8af18ea3f16f7e958c53278f4389b1b20a20f1e3cc58b72b302c926f070");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to request employee password reset"
			);
			reply.header("x-auth-sign", "31ad4ca6999aad0c086c6d9806545298 ||| 72b406ab9a6abaaef9daae3981554c7ded2bcc6e46c3d97ff4bac3a3315e8a8820c4165ca5686e38c6cf7d3f0f038e67");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password reset request failed",
			});
		}
	});
});

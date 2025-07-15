import { employeeRequestAPasswordReset } from "../methods/employeeRequestAPasswordReset.js";
import { employeeRequestAPasswordResetSchema } from "../schemas/employeeRequestAPasswordResetSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeRequestAPasswordResetRoute(fastify) {
	fastify.post("/employee/request-password-reset", async (request, reply) => {
		try {
			const parsed = employeeRequestAPasswordResetSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "04bab40072bff7ce22bcbb7ca3134744 ||| 065a5935c078995a7d9eae5944a692bea5db5c3b72a4225895826773781eb34b3e40c441bd2681b82b8fd2f039455b57");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { assignedEmail } = parsed.data;

			const result = await employeeRequestAPasswordReset(assignedEmail);

			reply.header("x-auth-sign", "4da1912f4fb7177fc77fd3e3dd08ac83 ||| bb9c2a6ec2164b506ee21cba307c2e10f3d770b30309c29025acda16cf2bca8d7ae8ce59c0cd1dec35ed1db08c33cb85");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to request employee password reset"
			);
			reply.header("x-auth-sign", "5eb2fb2dba5bffdef7a12d9e95e24cc3 ||| 93f71f859b38bf078efd6933b48527c267c622d7c3d26c4c49c6e65c4cd2d34db76bfd42ec2828e30e6d3f54b4b776a5");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password reset request failed",
			});
		}
	});
});

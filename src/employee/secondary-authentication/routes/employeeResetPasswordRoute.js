import { employeeResetPassword } from "../methods/employeeResetPassword.js";
import { employeeResetPasswordSchema } from "../schemas/employeeResetPasswordSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeResetPasswordRoute(fastify) {
	fastify.patch("/employee/reset-password", async (request, reply) => {
		try {
			const parsed = employeeResetPasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "76b8dc8b1ea34294886f409bd863eab7 ||| 2c6fce818db870c5a0f1b208be7891c4bf711008d9e34c2f7c5dd43b1c55c620ec3fa61fe0897ef2bb49a3046bb62fc6");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { assignedEmail, otp, newPassword } = parsed.data;

			const result = await employeeResetPassword(assignedEmail, otp, newPassword);

			reply.header("x-auth-sign", "5c5ead6a08080713f3aa41d66ad09441 ||| 78acf62b15b3a8e2ebcda6f5113912b870fe7a99428a2485e0f5402d01647beeec61e76eed23240a5cf90f2b559741e4");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to reset employee password"
			);
			reply.header("x-auth-sign", "002f75f976b90d96e294dc97ada1b363 ||| 34f6dd50890f1be68b64b1d8939df0cfe8b139c70e76d97061bc64b56ffecae41b349e1876c891c5bc71e2e1c480323e");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password reset failed",
			});
		}
	});
});

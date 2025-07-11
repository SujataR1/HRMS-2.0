import fp from "fastify-plugin";
import { hrResetPassword } from "../methods/hrResetPassword.js";
import { hrResetPasswordSchema } from "../schemas/hrResetPasswordSchema.js";

export default fp(async function hrResetPasswordRoute(fastify) {
	fastify.post("/hr/reset-password", async (request, reply) => {
		try {
			const parsed = hrResetPasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "49d90231f7be434f996df28fb49c88cb ||| 51063245c213ad21178c9f104be96e762dc192e75c0adee34a2ce102210b95b39f31898db7dce7c7a42c32edf8212b1a");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { email, otp, newPassword } = parsed.data;

			const result = await hrResetPassword(email, otp, newPassword);

			reply.header("x-auth-sign", "7d964e19021f7932056251b9634d39f4 ||| 884ba32e6595c3c9ade999a71bf6a9060b923f19ac0957f3379acbbc1839fa7316302d517d6c57186b65125b3d4b0e97");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to reset HR password");
			reply.header("x-auth-sign", "01aacedc54f4b93ec3ccb0f2f28a2b1f ||| e314a5d98caa31755d9aa80f3c97c4a89e5f68897854748354ea57313b50d129ca5ffebec4292ce5c224086f34f5f258");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password reset failed",
			});
		}
	});
});

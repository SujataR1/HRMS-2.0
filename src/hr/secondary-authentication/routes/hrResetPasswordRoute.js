import fp from "fastify-plugin";
import { hrResetPassword } from "../methods/hrResetPassword.js";
import { hrResetPasswordSchema } from "../schemas/hrResetPasswordSchema.js";

export default fp(async function hrResetPasswordRoute(fastify) {
	fastify.post("/hr/reset-password", async (request, reply) => {
		try {
			const parsed = hrResetPasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "3ad24eb1bc265550852ea91166480b70 ||| 21bc96ab8caa381c0be7c40815385f92b4e1feee775e4d575bbd0da0e6c699466a5dbfa48d4acf40bdcedac3910d6477");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { email, otp, newPassword } = parsed.data;

			const result = await hrResetPassword(email, otp, newPassword);

			reply.header("x-auth-sign", "8e04cdfca0ad9fbe6a5731f0a7c463e5 ||| dc35117181958952fa0597fc1cb5bdee3d15ce67158c257c237261051b753cceeb3e2daf466692aba9cd7994cf7ff840");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to reset HR password");
			reply.header("x-auth-sign", "0a3d9ad9c4919959a8f6557c3439af8f ||| 28d07c2cae476962c16d4982fb106905b808260f0e18c327ffdecf1fb1c159b35ada86e1437384f08ce10774dad3663d");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password reset failed",
			});
		}
	});
});

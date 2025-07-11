import fp from "fastify-plugin";
import { hrRequestAPasswordReset } from "../methods/hrRequestAPasswordReset.js";
import { hrRequestAPasswordResetSchema } from "../schemas/hrRequestAPasswordResetSchema.js";

export default fp(async function hrRequestAPasswordResetRoute(fastify) {
	fastify.post("/hr/request-password-reset", async (request, reply) => {
		try {
			const parsed = hrRequestAPasswordResetSchema.safeParse(
				request.body
			);

			if (!parsed.success) {
				reply.header("x-auth-sign", "b1c6e502c57980cb5dc3d19ea8bd0db5 ||| 8ac527fe0e87c03be46cc2020197e42378408b21c4a926c815a56d8c5b1428415ee100766198abfc782e9571a3bc2ffc");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await hrRequestAPasswordReset(parsed.data.email);

			reply.header("x-auth-sign", "0641a86ec0caeda26d1ed4a19e90cb5e ||| 47e513a7c60b8e71d222afc8533700f4f5cfd237c3aa255320d90a41ef3eac77105882c397d664e4c136fde0335b77d3");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to send HR password reset OTP"
			);
			reply.header("x-auth-sign", "b5fd5d5987b35e41c9b2b2f6edaaca58 ||| 8837620ed9447205575f71289445f7d937854ff3a4b9a9d9039a4cacd5e6cbb62e0094db2d23c5d2819d4871d99f0c59");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to send reset OTP",
			});
		}
	});
});

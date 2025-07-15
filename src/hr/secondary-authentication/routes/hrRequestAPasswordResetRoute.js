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
				reply.header("x-auth-sign", "c98843a1b611914cfd87443a296f51b2 ||| 35bf6143bec47c7380b00faf285b38256eb2b9692ed2f70c3ef0243fd4050656284d5904edfca697e13f4666809b2dcc");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await hrRequestAPasswordReset(parsed.data.email);

			reply.header("x-auth-sign", "e77aeea9d162c732f7164568ef7e339a ||| 4caae43bf02d9ec824842c71a344472facbea0360ca968a900e47c6cd6749d5de454df653b6c82c4496c967213c3638e");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to send HR password reset OTP"
			);
			reply.header("x-auth-sign", "e81c5ebba90ba01aed8d15d4ac318a1f ||| 0e5878f97c5e3dd71a17fbea0031c87cc01d1784ba0c97834c4e1f54357fd2141049200fc4894f76509b8ecaa43076f8");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to send reset OTP",
			});
		}
	});
});

import { adminRequestAPasswordReset } from "../methods/adminRequestAPasswordReset.js";
import { adminRequestAPasswordResetSchema } from "../schemas/adminRequestAPasswordResetSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminRequestAPasswordResetRoute(fastify) {
	fastify.post("/admin/request-password-reset", async (request, reply) => {
		try {
			const parsed = adminRequestAPasswordResetSchema.safeParse(
				request.body
			);

			if (!parsed.success) {
				reply.header("x-auth-sign", "c283ed0fe550d059e5d16a95337c31bb ||| 72f3d6301fc549606cc3246bff21cecff6c8acd504db7fb64d7ec2801c1b96d8981de647b6b22cfc8671e679b5ed022f");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminRequestAPasswordReset(parsed.data.email);

			reply.header("x-auth-sign", "473f8ba1132175489c69f3bd4f1a97ab ||| 1f684c38cab51b6487ad1adbf7c0908ed278cde676da3d18eabdd52627f7d5f0f6e26b38d6345314be3f01f5f0f0f4d5");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to send password reset OTP"
			);
			reply.header("x-auth-sign", "f37e5ab07f98db433be7574608cdb168 ||| a1cae555da8855155ada93a78a247f2d64048df79fca0b8215d16976a27604668fe06b27181db624431c9704018efac4");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to send reset OTP",
			});
		}
	});
});

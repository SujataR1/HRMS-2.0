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
				reply.header("x-auth-sign", "0b2168dc487dbe93024559c1b704f57d ||| b75e95b7dd7dca92ef4adb751eb47438e5b94d28fe2e4c59c26c9b0907eb18cb03e776ecc5dcbb9c470167e93f5bba29");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminRequestAPasswordReset(parsed.data.email);

			reply.header("x-auth-sign", "91d22f3abfbf80f657714676dd694af6 ||| d7a2e39c8a1b37e69ebd41357c370a126c7090a45eca806c2d73e9330c0d7e6f7786ae21a57f7acc8b83539062cb8094");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to send password reset OTP"
			);
			reply.header("x-auth-sign", "1b1577773b753e6c351098133bbd3ca4 ||| 38be679cb0749161270fb8311eace5efa087bbde6b505dd39f5d52134dd6a104aa336ad88b0d03ad5344f9ccf195d819");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to send reset OTP",
			});
		}
	});
});

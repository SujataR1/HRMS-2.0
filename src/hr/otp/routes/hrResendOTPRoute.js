import fp from "fastify-plugin";
import { hrResendOTP } from "../methods/hrResendOTP.js";
import { hrResendOTPSchema } from "../schemas/hrResendOTPSchema.js";

export default fp(async function hrResendOTPRoute(fastify) {
	fastify.post("/hr/resend-otp", async (request, reply) => {
		try {
			const parsed = hrResendOTPSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header(
					"x-auth-sign",
					"7a4b7c0b4f4d3b0c1de65a2e84b7e6af ||| 1f9c2e5d0e0d9f6a4a7fddc7c3d4b9b9f066a8d7a0f5de3bf51b2f0c3c62f9bcbab9f43d0d5a8f91f7a6b2e8a8c5d601"
				);
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			await hrResendOTP(parsed.data);

			reply.header(
				"x-auth-sign",
				"9f4b6f72b8a1d07e3c0f0a5b2b2f9b1d ||| 4e9b1a4d7cdd8a5f3a1b8c0d9e1f2a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3"
			);

			return reply.code(200).send({
				status: "success",
				requires2FA: true,
			});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ HR resend OTP failed");
			reply.header(
				"x-auth-sign",
				"1f2e3d4c5b6a79808796a5b4c3d2e1f0 ||| a8d7c6b5a4938271605f4e3d2c1b0a9f8e7d6c5b4a3928171605f4e3d2c1b0a9f8e7d6c5b4a3928171605f4e3d2c1b"
			);
			return reply.code(401).send({
				status: "error",
				message: error.message || "Unable to resend OTP",
			});
		}
	});
});
import { adminVerifyEmail } from "../methods/adminVerifyEmail.js";
import { adminVerifyEmailSchema } from "../schemas/adminVerifyEmailSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminVerifyEmailRoute(fastify) {
	fastify.post("/admin/verify-email", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "3d7b7da8b94605698ff8099fde89fec1 ||| ffe14bc5f83f590e2d3685f4c3b1cd1d41befe1f4419afd8ef9983005d13a9c02d2549a5b1ba39763e2857990e84655b");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = adminVerifyEmailSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "680d2348403f5c0c0367d75ac752d83a ||| 0497840a7a9a6cd1d81acc6c8ac233b1371ac6c8324a1683f4cf5e73f1792b179926e02ea6b57a664f9180ecc30237ae");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminVerifyEmail(authHeader, parsed.data.otp);

			reply.header("x-auth-sign", "7ef1158c0a3f0f1d0184e3c1687b740d ||| 58aac2b23b64b9b553e90290f9508fbaa27bccebeadf924a2b8bb4cc2c3c6970ac45eaa189a2b7ca9e8386c2a2bdb667");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Email verification failed");
			reply.header("x-auth-sign", "bc943fff5dea0f8bebeaf448ca8fae28 ||| 7546477a0ebe7009535a7cb1cc614c3f09a8fa48063789f94515421347aa5d4a0b4e0f0b74eab2c2b392bf4c2978550e");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Email verification failed",
			});
		}
	});
});

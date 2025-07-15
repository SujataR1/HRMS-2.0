import { adminVerifyEmail } from "../methods/adminVerifyEmail.js";
import { adminVerifyEmailSchema } from "../schemas/adminVerifyEmailSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminVerifyEmailRoute(fastify) {
	fastify.post("/admin/verify-email", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "b560babe47df28ca088f972571144aa7 ||| a6e7297eecb876899e15e91e0365004753d11e3c23e159e400e90b9083c4b70e31c5aa9618ba2afd72226897a402fd4b");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = adminVerifyEmailSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "da1a208d7de24f555f0c1f1b2d7259f4 ||| 7c284c8530aad27da09108c63095e11c91ddf72655666ecfa6fca69d3f94a8dfa708aa724da63c07139cc3e2667611de");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminVerifyEmail(authHeader, parsed.data.otp);

			reply.header("x-auth-sign", "43c3030b0ec430ab1a59b2c6b2f00269 ||| 79141efa8511fcfa6470df5e6237dbbc10a2fd15b66d56c458045115eb754e59d4e080106000ae117752b078afad59d7");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Email verification failed");
			reply.header("x-auth-sign", "a0e8f7a5867d858cb624078565a5884c ||| f420b916ad9d6dc0bc57e31832baac18fe53660790646daf9b4d0796814ed6eea5fe75d5a7860b074fd6b6d56bc19bd9");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Email verification failed",
			});
		}
	});
});

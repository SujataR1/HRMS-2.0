import fp from "fastify-plugin";
import { hrLogin } from "../methods/hrLogin.js";
import { hrLoginSchema } from "../schemas/hrLoginSchema.js";

export default fp(async function hrLoginRoute(fastify) {
	fastify.post("/hr/login", async (request, reply) => {
		try {
			const parsed = hrLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "DsZfrFGi6my9rPPuLZ7dS+oltFlg/gwuVZesjxGnv83qGe/X7S0dRuhqgoK4zLbd7+W+JfAQ/GMtTYG89hhOVQ==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await hrLogin(parsed.data);

			if (result.requires2FA) {
				reply.header("x-auth-sign", "jwxLAKz5cVhnasTOMO0beXoAnF7ZIYlDd5ry6dA8IxtMM5qnRk/yvF/gdQ3ZWUGRp0wifUKNCsy3x/fkprdqOw==");
				return reply.code(200).send({
					status: "success",
					requires2FA: true,
				});
			}

			reply
				.header("Authorization", `Bearer ${result.token}`)
				.code(200)
				.send({
					status: "success",
					authorization: `Bearer ${result.token}`
				});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ HR login failed");
			reply.header("x-auth-sign", "u3LC5Kjzhf3yCNSFPB26004zpz21OjBLWaQ/yVUhMOaJYCjhTA6gqeAZdwwopsxl8KtMBInz/B5gVFxBMD2dmQ==");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Invalid credentials",
			});
		}
	});
});

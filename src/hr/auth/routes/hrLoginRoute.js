import fp from "fastify-plugin";
import { hrLogin } from "../methods/hrLogin.js";
import { hrLoginSchema } from "../schemas/hrLoginSchema.js";

export default fp(async function hrLoginRoute(fastify) {
	fastify.post("/hr/login", async (request, reply) => {
		try {
			const parsed = hrLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "ec9d419973a8a29387021f9fdc535d74 ||| 7d661aa725cf39b439c84e6b839cbcc06795b81fb6aeb7f33306fed52d9b1664349a6ac12e74ba6e24362569ed4e52fb");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await hrLogin(parsed.data);

			if (result.requires2FA) {
				reply.header("x-auth-sign", "6d8a799a6f3eddb96e45b7788fd2c6ee ||| 7ebefa24be320b950b4d7b66b8f1c1a8321e32b51d10a01c6e5caf26922d7e2c6e5919eb923a412cd7bd1ed0fbc1365b");
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
			reply.header("x-auth-sign", "4fd4444debc331afdae3273242822c22 ||| c7d57a9faaa0d720002ca84a403620cd0f11c6cc92aee6da9a9448cf784ec41016cdc6bd264e326293132b810c8a16e5");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Invalid credentials",
			});
		}
	});
});

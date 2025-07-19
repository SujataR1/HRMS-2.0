import fp from "fastify-plugin";
import { adminLogin } from "../methods/adminLogin.js";
import { adminLoginSchema } from "../schemas/adminLoginSchema.js";

export default fp(async function adminLoginRoute(fastify) {
	fastify.post("/admin/login", async (request, reply) => {
		try {
			const parsed = adminLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "d99e1902c8b25348091efe638ff520de ||| 7f50cf1bd08e91b0a8218ddf86972f39c77c3310a1e2fc06c83d58caa4ab05039eb2781e7cba3cc3dede3320a6307759");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminLogin(parsed.data, request.meta);

			if (result.requires2FA) {
				reply.header("x-auth-sign", "5eb276bcc7ef628db54924364b14e96d ||| 14bc0513e26d15020687e113c8e3c8c56b6d8a542fc53c61a7b7345cbc88dcb255609420dc853095220f30318d204088");
				return reply.code(200).send({
					status: "success",
					requires2FA: true,
				});
			}

			reply
				.header("Authorization", `Bearer ${result.token}`)
				.header("x-auth-sign", "924b1c569d9fb5e8b12c9e1bb7ca2c16 ||| 37feda7ffca971221c89ee8516ed43f49be87a671cbd1090e55d632833f0b70a8f239dd62d880722f1b16144537c7fc5")
				.code(200)
				.send({
					status: "success",
					authorization: `Bearer ${result.token}`
				});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ Admin login failed");
			reply.header("x-auth-sign", "9e206aad85aa77e41dc0e5899377eb6b ||| 81a0173ba6b6888093d9fdad8ed51e248b7673ca551d92a1d3f581245466d7e99fa0074c3c4126e04923388f6933bc6e");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Invalid credentials",
			});
		}
	});
});

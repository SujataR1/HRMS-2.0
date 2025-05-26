import { adminLogin } from "../methods/adminLogin.js";
import { adminLoginSchema } from "../schemas/adminLoginSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminLoginRoute(fastify) {
	fastify.post("/admin/login", async (request, reply) => {
		try {
			const parsed = adminLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminLogin(parsed.data);

			if (result.requires2FA) {
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
				});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ Admin login failed");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Invalid credentials",
			});
		}
	});
});

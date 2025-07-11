import fp from "fastify-plugin";
import { adminLogin } from "../methods/adminLogin.js";
import { adminLoginSchema } from "../schemas/adminLoginSchema.js";

export default fp(async function adminLoginRoute(fastify) {
	fastify.post("/admin/login", async (request, reply) => {
		try {
			const parsed = adminLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "84b648542f743ceb8b3a9c6065f72b9d ||| a8a18e05cf738c021813c89c13dd2c181c788ce0bf5b562bc44fd53c0facac9918dfcd9610c57ee6e4a02b8bdeff6fdb");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminLogin(parsed.data, request.meta);

			if (result.requires2FA) {
				reply.header("x-auth-sign", "6943fb300ae6a5e50565009bb9ef13bb ||| 3333f87d385c189fdd97975fa15d541a35997fa2e0098bc6d0ff506de7b02e399420817de8b3096db8df4c63cfbbf4d0");
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
			fastify.log.error({ err: error }, "❌ Admin login failed");
			reply.header("x-auth-sign", "8c586c188fe43b40e6b2aa39a56e1671 ||| 3bd46d1a0528a45015432023a660246bd33dec51e6133d2fd266de7858215d6861bb39c6908daf7b94bb8127bf4e881f");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Invalid credentials",
			});
		}
	});
});

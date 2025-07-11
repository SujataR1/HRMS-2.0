import fp from "fastify-plugin";
import { adminLogin } from "../methods/adminLogin.js";
import { adminLoginSchema } from "../schemas/adminLoginSchema.js";

export default fp(async function adminLoginRoute(fastify) {
	fastify.post("/admin/login", async (request, reply) => {
		try {
			const parsed = adminLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "33kkxQViU11Y5hD8P600eAi65k1ye7cgiM8OE4BWNHkyPLsuHLt3Oy5tDf39coqteTzOKmePiLM4IKoTYdkFTQ==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminLogin(parsed.data, request.meta);

			if (result.requires2FA) {
				reply.header("x-auth-sign", "Kq8PTkkXFlZtHHRcH5wzygfj1jVr7D5epwY1t0/oGsUN456dy4PPQQcabzr9OHiFnEOIMMAbVjjUmEG8nQlj2Q==");
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
			reply.header("x-auth-sign", "+/9Iwmy/bu1/xVhCEIbNF+PkGKCDrOt0YrnZa6KNIPVzCPaciOTcTPhEwg4ZcuL4v7RJ58MJ/zO34LY0rOk6pA==");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Invalid credentials",
			});
		}
	});
});

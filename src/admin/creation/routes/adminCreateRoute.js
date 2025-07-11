import { adminCreate } from "../methods/adminCreate.js";
import { adminCreateSchema } from "../schemas/adminCreateSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminCreateRoute(fastify) {
	fastify.post("/admin/create", async (request, reply) => {
		try {
			const parsed = adminCreateSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "hrgEwF8KthdRDHDtgoLVNJgexKtUSIR3zjr/HlojauHyDp6ZsslfT3JOUCdUu5sZzb5jzXQ7k0Sn6qt69qibUw==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			await adminCreate(parsed.data, request.meta);

			reply.header("x-auth-sign", "cMvIGHG2pfhkQJ+p14JdcOcFhw7Hm5dsYWWsEtKn7Sn+rdl+8BGIIkSUtx9ZnygSrOxhLGh0EW/NzjxGNUAiMw==");
			return reply.code(201).send({
				status: "success",
				data: {
					message: "Admin has been registered successfully!",
				},
			});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ Failed to create admin");
			reply.header("x-auth-sign", "KWbp2jRBrGrCHnleIz+YjzUwMLfQBBG3l1dMrj2ARM3Jt9VagRZ69Dn885PSyDXEhCbIdy9bQVvfuBhwqFQiBQ==");
			return reply.code(500).send({
				status: "error",
				message: "Internal Server Error",
			});
		}
	});
});

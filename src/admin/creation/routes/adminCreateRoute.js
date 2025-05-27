import { adminCreate } from "../methods/adminCreate.js";
import { adminCreateSchema } from "../schemas/adminCreateSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminCreateRoute(fastify) {
	fastify.post("/admin/create", async (request, reply) => {
		try {
			const parsed = adminCreateSchema.safeParse(request.body);

			if (!parsed.success) {
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			await adminCreate(parsed.data, request.meta);

			return reply.code(201).send({
				status: "success",
				data: {
					message: "Admin has been registered successfully!",
				},
			});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ Failed to create admin");
			return reply.code(500).send({
				status: "error",
				message: "Internal Server Error",
			});
		}
	});
});

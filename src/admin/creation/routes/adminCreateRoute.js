import { adminCreate } from "../methods/adminCreate.js";
import { adminCreateSchema } from "../schemas/adminCreateSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminCreateRoute(fastify) {
	fastify.post("/admin/create", async (request, reply) => {
		try {
			const parsed = adminCreateSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "f0cc5d9d38154da7803f46ab23c0a91d ||| e7f6c0adec02e91ac9d2175fc4c8891c12d9961252051a9b275b802f423ab19f7429f6ba178928a746c838253e5b23d1");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			await adminCreate(parsed.data, request.meta);

			reply.header("x-auth-sign", "c934d7597259393b6bf2ba78e664fe5e ||| e6019e4cb3fa1c6952ff98c8a7ab60c942698e8511fab01ee011637cc35ca16e7170f1f94a0df3a3ec81e892459467c2");
			return reply.code(201).send({
				status: "success",
				data: {
					message: "Admin has been registered successfully!",
				},
			});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ Failed to create admin");
			reply.header("x-auth-sign", "8b9890e182bc96a12d082fc29f904687 ||| 090e5715e6df308d720973a53498606368564a380875936c126f0e137d6f929de86cc30b9d125a8afb374115fc27ae6e");
			return reply.code(500).send({
				status: "error",
				message: "Internal Server Error",
			});
		}
	});
});

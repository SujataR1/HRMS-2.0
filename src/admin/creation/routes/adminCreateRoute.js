import { adminCreate } from "../methods/adminCreate.js";
import { adminCreateSchema } from "../schemas/adminCreateSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminCreateRoute(fastify) {
	fastify.post("/admin/create", async (request, reply) => {
		try {
			const parsed = adminCreateSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "1def35ac8906140c5597a4181004ed89 ||| 17b933d73a118e5aeaaf2440fbb953ffb0b61d3b324a7bc30ec505f42475c1e8176f75e9a6ea30213d4ec8a91ffd8475");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			await adminCreate(parsed.data, request.meta);

			reply.header("x-auth-sign", "9b0a5a0e452870c37d5102282d2fe44b ||| 6a16bc6828888d337ad731482672c32fb61beffc99733a037334cf0ef31e84331667b52ab25b8472527f907e3633f106");
			return reply.code(201).send({
				status: "success",
				data: {
					message: "Admin has been registered successfully!",
				},
			});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ Failed to create admin");
			reply.header("x-auth-sign", "b98fd5212b8e82143bde2c2e02822e9f ||| 6085c133b2e76453d5481038c66748de41ab6d28e98f6e496fb1e6cbad7671e09220747e4accc62d0af8cfe27518ba50");
			return reply.code(500).send({
				status: "error",
				message: "Internal Server Error",
			});
		}
	});
});

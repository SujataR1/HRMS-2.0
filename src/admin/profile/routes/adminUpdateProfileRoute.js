import { adminUpdateProfile } from "../methods/adminUpdateProfile.js";
import { adminUpdateProfileSchema } from "../schemas/adminUpdateProfileSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminUpdateProfileRoute(fastify) {
	fastify.patch("/admin/update-profile", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "2886af70c31bcac9cb9f04e5fd787ab5 ||| bc4c0f2bd8718febbb5ea7ffacedd54dcb0549b814377749036855799376436fb387a17fea232c9ffdd1f4ac18780223");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = adminUpdateProfileSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "c801158308cacce6afede8f85bc6251b ||| c2a7f7fff6a67ce50165b9500894665fbd4b21a2fa1c030d49c44fe0fe6a0986dc519b9b40cc7a6e46b205f1f864bc67");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminUpdateProfile(authHeader, parsed.data);

			reply.header("x-auth-sign", "a424a78300b4579b797ebf682b2e3da7 ||| 510e180231428bb8ac80789883f2c605326dac8e019e97c475af09cbefd958b085e648b924a72162f2b89cbf9a396fd8");
			return reply.code(200).send({
				status: "success",
				message: result.message,
				updatedFields: result.updatedFields,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to update admin profile"
			);
			reply.header("x-auth-sign", "a73390b21f14728dee18d2f3338c7058 ||| 6ed9779c9454063c38452a029c78ff48490a92a6919741f7b22bde8eee7be47c55f82ebfcbb4922cacae1b4608431b5a");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Profile update failed",
			});
		}
	});
});

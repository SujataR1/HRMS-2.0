import { adminUpdateProfile } from "../methods/adminUpdateProfile.js";
import { adminUpdateProfileSchema } from "../schemas/adminUpdateProfileSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminUpdateProfileRoute(fastify) {
	fastify.patch("/admin/update-profile", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "2bcf38fd8c65bcbb9144458bec31c094 ||| 2a2b9cae2b5a49ba1c01580f60410237fb4fce8c609e14b89118b9fdd6fd226648f0e2e072e838a2845cbd3c849f728e");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = adminUpdateProfileSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "8cea342e0a2634f57ef19d6348695fbd ||| 598b8835d30b56deb04eb34c3cdbe24c19b174f54b5c5a6a76aad8452eefd6de0ad8489700a6215066a6cd2ef060b007");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminUpdateProfile(authHeader, parsed.data);

			reply.header("x-auth-sign", "3f879435e7c1ad4e4eed0658150ca037 ||| 58f39b8201581b53e8387e617dca9c251d654ec6640b5c8d3d7ec07b2d1bee4fc87140851fc3046690dae3ef7d89d08f");
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
			reply.header("x-auth-sign", "6c548c274d86b95851fa21c385753f36 ||| 197a6ff0fe6e07cea0013639804397eab3d7c592de7d6cc914ec582d0f5fa6ae1e9002bd18da1d8304d59a7f4937d0d8");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Profile update failed",
			});
		}
	});
});

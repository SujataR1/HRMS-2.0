import { adminUpdateProfile } from "../methods/adminUpdateProfile.js";
import { adminUpdateProfileSchema } from "../schemas/adminUpdateProfileSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminUpdateProfileRoute(fastify) {
	fastify.patch("/admin/update-profile", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = adminUpdateProfileSchema.safeParse(request.body);

			if (!parsed.success) {
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminUpdateProfile(authHeader, parsed.data);

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
			return reply.code(400).send({
				status: "error",
				message: error.message || "Profile update failed",
			});
		}
	});
});

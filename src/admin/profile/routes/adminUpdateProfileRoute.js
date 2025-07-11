import { adminUpdateProfile } from "../methods/adminUpdateProfile.js";
import { adminUpdateProfileSchema } from "../schemas/adminUpdateProfileSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminUpdateProfileRoute(fastify) {
	fastify.patch("/admin/update-profile", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "YuNW6ogNNV3zPV0gEAosATTSSkHlDFuPmBSkcoXaFdNLwRAP04xHP/36wbKMcB46WhRC+IZWLm4lULGSxB96xQ==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = adminUpdateProfileSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "63O4BCBk46I2JS+2fmo73bxISnDhkDbtsEpblzbd5XqZ+31xxdEcKsBq13Ryz2jDY1c9sK5m+93NFrJ4mLgDjw==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminUpdateProfile(authHeader, parsed.data);

			reply.header("x-auth-sign", "SgjhGYzkLp5ErYOGaSTIs76avH7DRCdj123PPsvAtiGbjdG6L4dvGUhhtwEV00TYjPycmsWwWk0n6AL+nnq8ww==");
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
			reply.header("x-auth-sign", "zdLdl4LZTnM+YMMOBbENfU7lgHz8NY408HAvI0Xv081+BbaCdLT9kNr72jlyhPKjxN0FYTpWPjxZSCzPqgbShw==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Profile update failed",
			});
		}
	});
});

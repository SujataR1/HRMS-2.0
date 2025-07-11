import { adminUpdateProfile } from "../methods/adminUpdateProfile.js";
import { adminUpdateProfileSchema } from "../schemas/adminUpdateProfileSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminUpdateProfileRoute(fastify) {
	fastify.patch("/admin/update-profile", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "P0wj7KKwLhyX7y2DU2e935qk9M61ADEjk3THRnXW92TBg6JH1/3/YYm6jDw9mHjlM0+HvFgpEnnLJ2aH0B4+eA==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = adminUpdateProfileSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "UBurUjwVebjzWqTntuYrZtGoIoINukuhz6V/Vp+Mhh0qC7ELfbISaMv8DKVdR+CbnBfCYcc/oi3KbW60U1fTzA==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminUpdateProfile(authHeader, parsed.data);

			reply.header("x-auth-sign", "nsY1iveynh/en8ZBQhRR/cQXIK34/tmdl8EgYIV5wx6rzChbDckV2LChhS/nI40YHdQ0vA8/psD3JfjCyCq8ig==");
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
			reply.header("x-auth-sign", "uEb2alJslHckvbr5QMEa3OyX3XjTDEv3u0YwqSiFsV2DWxwfKzY6EtQsik9HPB/JcQ3lm7kzxtDkY86z0WzPCw==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Profile update failed",
			});
		}
	});
});

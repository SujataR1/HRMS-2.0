import fp from "fastify-plugin";
import { hrChangePassword } from "../methods/hrChangePassword.js";
import { hrChangePasswordSchema } from "../schemas/hrChangePasswordSchema.js";

export default fp(async function hrChangePasswordRoute(fastify) {
	fastify.patch("/hr/change-password", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "nueOLqRmln5TaHaEjBEJ0nFdPYiHZFdPjjPgZ9idjV5ATqKz6JUAdnJSa+cKfZQROpEdvhYLWQP4t3f1qQ7LAA==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = hrChangePasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "0WunLjUKBMHVrHv+6cJRz6N8j6PIGr0f1abOaHEk4owDR06SF6zkyVd4JoWB+VVRAP5vrMw8AaLARTH5mUMTOw==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { oldPassword, newPassword } = parsed.data;

			const result = await hrChangePassword(
				authHeader,
				oldPassword,
				newPassword
			);

			reply.header("x-auth-sign", "KDskz+V1E/rcp3QZQtk+BQ7byXW+RwTUIgjgwU7CbetiCwMqkbjOA5KldAH8GRlEd/gKic7S2nAFYaMngRROtw==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to change HR password"
			);
			reply.header("x-auth-sign", "NqI6KkLX1ftEUFCNVMvqyw7UTGiab70HkrwU3qy5efKMJcvOM0g8yOm4CV8tvTOIPZqU5yRDV4/FcfITpt1zOw==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password change failed",
			});
		}
	});
});

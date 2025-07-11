import fp from "fastify-plugin";
import { hrChangePassword } from "../methods/hrChangePassword.js";
import { hrChangePasswordSchema } from "../schemas/hrChangePasswordSchema.js";

export default fp(async function hrChangePasswordRoute(fastify) {
	fastify.patch("/hr/change-password", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "qi3hXRitKdTpYgcndLlUFYKKg18+JaAbXZrUxselWthWbmx6WEkITmf3/ypVITx8orMvb7gsD4/OMhC6s2xB5g==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = hrChangePasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "y5Ma0fyB0WoL6123gIKc/xFq67ixZkhkWU/XMFKphmT0waUv8y6CFY4dj8p2ShD56y93rU32SqCiqk8hY0UNmw==");
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

			reply.header("x-auth-sign", "1pVDRPlV2NBpgoWdvaNaI9Ry6YjOYJrLydmQK/NggomWjKfeM86gReH3ZEBy1CLsPKkZN7ZyxpSii0gCARk4ug==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to change HR password"
			);
			reply.header("x-auth-sign", "a1Sr6i61Fmjd4WzBGQpjsvbxZMkdHQNtYE537Yc7AwYQpQhvEiAQ0ZiPKG0QL2OdT6okRN2DSwmCWdDCfHmkYQ==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password change failed",
			});
		}
	});
});

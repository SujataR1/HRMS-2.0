import { adminChangePassword } from "../methods/adminChangePassword.js";
import { adminChangePasswordSchema } from "../schemas/adminChangePasswordSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminChangePasswordRoute(fastify) {
	fastify.patch("/admin/change-password", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "58a41476f9fc6f2af6d7460c8acbe54a ||| 5a12c60610ede07320419de7d164c740977b93f296c858d4967a2a8c8a27959e75aefea8f1bb7bca798943eed83e8f97");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = adminChangePasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "6728640d22a4e7860aafa0272dfa8081 ||| 052908da9b364740faf1965e56306c65503aaf56aafd3567567bfb8ee074af9011bf46a04f855f0aab50aa81e82c2ad1");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { oldPassword, newPassword } = parsed.data;

			const result = await adminChangePassword(
				authHeader,
				oldPassword,
				newPassword
			);

			reply.header("x-auth-sign", "de67f103533ec33409eeb8d7a6944a4d ||| 0cd19e44e1c351d8a89c057fa1585f287225821599785bbcc8577ea01fb7f7d795bfd26fd090d36ee3df768769b025e4");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to change admin password"
			);
			reply.header("x-auth-sign", "e1269dbd61f53cacebc4503c303933a7 ||| 16c2164b2a7cb18c5e224f9be61bf69dfad004c4ce70e4ee44e23c127be6a073ee06feba1df209c18398698d72c0cac2");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password change failed",
			});
		}
	});
});

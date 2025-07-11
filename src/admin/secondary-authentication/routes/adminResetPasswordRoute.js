import { adminResetPassword } from "../methods/adminResetPassword.js";
import { adminResetPasswordSchema } from "../schemas/adminResetPasswordSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminResetPasswordRoute(fastify) {
	fastify.post("/admin/reset-password", async (request, reply) => {
		try {
			const parsed = adminResetPasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "51baaf1ac0c97dd44d4a6f4cde3153f9 ||| 0d71335ea039927ddae47af39697b32ad279f729dcc24a5584cc35e2572303655d3d03c210ca07a51ca3222ecb29bacc");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { email, otp, newPassword } = parsed.data;

			const result = await adminResetPassword(email, otp, newPassword);

			reply.header("x-auth-sign", "8d32fd220ed52736ec18eb3ff9c004d9 ||| 4f508b8852de9e6d79d9d50891fbc4917be6a56eab7d1549e30b0ad205d8ffab531f755633d60f8a1afdb62db2a92e7d");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to reset admin password"
			);
			reply.header("x-auth-sign", "92f7a2248b74e6e4d00cdb3c025b5bb1 ||| 11d23a6bd7da8ad48fb0ed878ae75b930404acb5612aa8f49bd092e9acfae6327fe67d809cf09cad96cf35d9917c10a4");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password reset failed",
			});
		}
	});
});

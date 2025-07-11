import { adminResetPassword } from "../methods/adminResetPassword.js";
import { adminResetPasswordSchema } from "../schemas/adminResetPasswordSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminResetPasswordRoute(fastify) {
	fastify.post("/admin/reset-password", async (request, reply) => {
		try {
			const parsed = adminResetPasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "a53a4cdcd4f626d16ec54cc4500b9296 ||| f65580b1e73ac0fcda609d17aeee2d51a6115ee90689321b321bc028744cf4ae1bb111239423cf55b482e2664e47f10c");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { email, otp, newPassword } = parsed.data;

			const result = await adminResetPassword(email, otp, newPassword);

			reply.header("x-auth-sign", "96409d44d48914b210e3df3634b7a51f ||| a339a46d72f647cde859a27b2f4825cac76b56cef6c36fab6cc126c2360fd2a528965ef8d023e77b8e54bdf2bd6b98bb");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to reset admin password"
			);
			reply.header("x-auth-sign", "03272f90ad30f949615243272ca2a877 ||| eee87328d27471d4b3e74bef96721eac9345ba5e80ff2302140d29ef130fb55939019549840215f138d2713de0ee1d53");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password reset failed",
			});
		}
	});
});

import { adminResetPassword } from "../methods/adminResetPassword.js";
import { adminResetPasswordSchema } from "../schemas/adminResetPasswordSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminResetPasswordRoute(fastify) {
	fastify.post("/admin/reset-password", async (request, reply) => {
		try {
			const parsed = adminResetPasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "PxssRsdzfMR10U23UosNDnGuq2FWNzpfAQ0zIhpzzzMUsp5FVNNxK71EpDhfpy5voYq2TmhBcwi81r3JFm1opw==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { email, otp, newPassword } = parsed.data;

			const result = await adminResetPassword(email, otp, newPassword);

			reply.header("x-auth-sign", "pC4r+OXPqJJhPbcg8YbYgPRaoGsWS4fz2Xu4aSCb1BhFwjyVF4gsRPVPCTQIjV/SafUiS1ILUCq7VXYXcXuUdA==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to reset admin password"
			);
			reply.header("x-auth-sign", "BT6apYOITf3lKQWonUorhWCxkTdQFfkE8mAN5M6NOAGYAHp+mFY8tb6d9D1ZrKc0TwGhY1OvV7J7MxHJK03e+A==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password reset failed",
			});
		}
	});
});

import fp from "fastify-plugin";
import { hrChangePassword } from "../methods/hrChangePassword.js";
import { hrChangePasswordSchema } from "../schemas/hrChangePasswordSchema.js";

export default fp(async function hrChangePasswordRoute(fastify) {
	fastify.patch("/hr/change-password", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = hrChangePasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
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

			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to change HR password"
			);
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password change failed",
			});
		}
	});
});

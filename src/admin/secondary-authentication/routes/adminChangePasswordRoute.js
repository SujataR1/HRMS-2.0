import { adminChangePassword } from "../methods/adminChangePassword.js";
import { adminChangePasswordSchema } from "../schemas/adminChangePasswordSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminChangePasswordRoute(fastify) {
	fastify.patch("/admin/change-password", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "GI2IPyd98BoMGQKbTkOD508E9f3LIOLAX139umLG6v3uqDm7O0T8HG50BoRsuVHg0an09YjE5jnQwu2ZlDRgPQ==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = adminChangePasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "9B42c/VktevXzZ8CP+Z7+479MLQNx6FBhhbAvKmGeWSF0w7e34O69t0yZzdIeywoybc44t9Hn6Pr4SEfF2X5YQ==");
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

			reply.header("x-auth-sign", "1NJQqvgmylAoKeIZ5i79W5/trEjSyynZvhnsS4PbdlRHSCcOGuuiLJfXk/2xNOG8e4IUjONPmFyBpRx7rRcHmw==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to change admin password"
			);
			reply.header("x-auth-sign", "TJ7z/6JdEosJbJh4pEGQ4zs26ArrBhKpiRTq1h8nt2BseuV77kNobxhq2kApSAjV9hc2TiOAvhkl+Zn1cyXalA==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password change failed",
			});
		}
	});
});

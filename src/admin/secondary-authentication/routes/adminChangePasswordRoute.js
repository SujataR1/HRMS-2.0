import { adminChangePassword } from "../methods/adminChangePassword.js";
import { adminChangePasswordSchema } from "../schemas/adminChangePasswordSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminChangePasswordRoute(fastify) {
	fastify.patch("/admin/change-password", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "WRYgKVFHwsnE7FdRMbEiDzsA9Slayb4yJFcyQ1PJOoEGL8dH/f07Sy6aDDK88tbNxjYHiUrYtoJfwhHBOyLQmg==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = adminChangePasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "g85VLUMlJ9wBYFyXLhy8GJZODwEvC55pJf0mFujbO+jfT8u5Od7FgGSr7X3nBWgjxNXvN+qfMXBDZp0GXP1/aA==");
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

			reply.header("x-auth-sign", "t4ijZjWaiNz++gzScqVsBslATGpB2V2s7FOYVtgF3QbB5ad/FBi5rJxbjwJgCQCzxTQ9a+fHNmK66EIfKjWDOA==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to change admin password"
			);
			reply.header("x-auth-sign", "HbQUF0MurhxMwQ72TLnNmBPOJeg0WSxV1f2EbiSvxZYJB86H2Hcy+5kw7sZMzq4HLBhCVNBgYRSlC6zxfwnUBQ==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password change failed",
			});
		}
	});
});

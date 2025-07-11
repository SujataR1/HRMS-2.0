import { employeeChangePassword } from "../methods/employeeChangePassword.js";
import { employeeChangePasswordSchema } from "../schemas/employeeChangePasswordSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeChangePasswordRoute(fastify) {
	fastify.patch("/employee/change-password", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "d96r0LDioRFEwLXfb4qJ2vxhvnhGLBL2A6pMRwh2618XlTTua3h1czjWyOVi5uGTB0VcJDOppmCidJnjO8sDgw==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = employeeChangePasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "zfqmzfhEIQW12YO0p2DPQwcy1hLz/+cLT4RTqdqqpfAN8wCz6B90fqx0LYzKFY2dep7DILLJCjupuQHASnvb5Q==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { oldPassword, newPassword } = parsed.data;

			const result = await employeeChangePassword(
				authHeader,
				oldPassword,
				newPassword
			);

			reply.header("x-auth-sign", "l1mHki9A9oiZrtcPfpVgCpewwsF/Qii1cSb90frec3+c8vD4qJC3qfGJp83MrXbhPx+4ey3TMuRVJchgfr+8ng==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to change employee password"
			);
			reply.header("x-auth-sign", "W1uLrVue/6voy8uaVitYGX3sFwczmFQqJ6b1aBxMTONIQL+Lt5chWzdVn7sLi0bOFUbtN/4WsjDOWVO4iuXC5g==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password change failed",
			});
		}
	});
});

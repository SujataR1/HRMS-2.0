import { employeeChangePassword } from "../methods/employeeChangePassword.js";
import { employeeChangePasswordSchema } from "../schemas/employeeChangePasswordSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeChangePasswordRoute(fastify) {
	fastify.patch("/employee/change-password", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "nHwCNe+g/uAd9mpy6HpfjKu5WXJ3mKcVNQhUegKMOhrE3SbYsI7TZMRsB7EVQCa/URwjINMq2ZXCpH8AE4npHg==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = employeeChangePasswordSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "O0035kG0/csvp2QicRNA2har+QCXXlfctDjwitZXdpNIqmrFtLDKy/jxKuBDvmPKd2Q3p6cycaijH3/RsrILVg==");
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

			reply.header("x-auth-sign", "BZB4zXrXyKQoZOYX41gUFOAfvbpgAkZ279YiKXvxoc4UpM4/mx/krmT2QlMiLw6pOkr841z42DoGQJt80PIVXg==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to change employee password"
			);
			reply.header("x-auth-sign", "pPXAVxXiMJVDuoEBSLV8MYfiXLCQNkJopJWMOx6Tw6bp4iKs+IKeriUKJ9wE2wPYi8mqybp0/No6zh0U0df92A==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Password change failed",
			});
		}
	});
});

import { employeeVerify2FAAndLogin } from "../methods/employeeVerify2FAAndLogin.js";
import { employeeVerify2FAAndLoginSchema } from "../schemas/employeeVerify2FAAndLoginSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeVerify2FAAndLoginRoute(fastify) {
	fastify.post("/employee/login/2fa", async (request, reply) => {
		try {
			const parsed = employeeVerify2FAAndLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "3eba027323717e6aabed4c96fef948e2 ||| c0bcc8d41ca973ad1a31d839614c336a342e0bb4581fae571fb85b761354351ed68a99514f85f28ad3bc91b67bafff42");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { assignedEmail, password, otp } = parsed.data;

			const result = await employeeVerify2FAAndLogin(assignedEmail, password, otp);

			// ✅ Send token via Authorization header
			reply.header("Authorization", `Bearer ${result.token}`);

			reply.header("x-auth-sign", "c63cf095751113d81c6d92b8ff2daf66 ||| 2712967a35eb16b663842e755256faf84b2c93466d6bd61822a82cf68ce9cce70f245d7d1ddd309c1ffc067705a78267");
			return reply.code(200).send({
				status: "success",
				message: "Login successful",
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to verify 2FA and login employee"
			);
			reply.header("x-auth-sign", "852fd6573033fb00ee1cf8fe8aae5120 ||| 8d6786e3ee4ad00bf09e30bacbd8b7bc3e65496ac030c873916c96c53099e654ac0d00d6164fd5ff008f584c67df4545");
			return reply.code(400).send({
				status: "error",
				message: error.message || "2FA verification failed",
			});
		}
	});
});

import { employeeVerify2FAAndLogin } from "../methods/employeeVerify2FAAndLogin.js";
import { employeeVerify2FAAndLoginSchema } from "../schemas/employeeVerify2FAAndLoginSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeVerify2FAAndLoginRoute(fastify) {
	fastify.post("/employee/login/2fa", async (request, reply) => {
		try {
			const parsed = employeeVerify2FAAndLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "uzrFxevWDOl3FWj63kezXPOZNOm7pRgoZ++KAo425NBfzMl5bh8Fjtv9BBugg2S9hP5I3q1qUROSk+GITcsW7g==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { assignedEmail, password, otp } = parsed.data;

			const result = await employeeVerify2FAAndLogin(assignedEmail, password, otp);

			// ✅ Send token via Authorization header
			reply.header("Authorization", `Bearer ${result.token}`);

			reply.header("x-auth-sign", "y8cOOjzlLJW4cBwUXBmsdRwNx4Wvc+rkmVZeMW1poKIkGPa2HNm8la/omkkpNb78bj10tmQ6h/x9in5mj8++Dw==");
			return reply.code(200).send({
				status: "success",
				message: "Login successful",
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to verify 2FA and login employee"
			);
			reply.header("x-auth-sign", "VxXVWD0mQ+15XVag5zv+vYn2LXXa1uQkrYV6U1l9N6yqvhApuylMLe3IW7xmiOYjPX1diIP/w1DM+8c/IOaOsA==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "2FA verification failed",
			});
		}
	});
});

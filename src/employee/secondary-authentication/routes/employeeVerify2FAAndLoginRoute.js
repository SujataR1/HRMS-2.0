import { employeeVerify2FAAndLogin } from "../methods/employeeVerify2FAAndLogin.js";
import { employeeVerify2FAAndLoginSchema } from "../schemas/employeeVerify2FAAndLoginSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeVerify2FAAndLoginRoute(fastify) {
	fastify.post("/employee/login/2fa", async (request, reply) => {
		try {
			const parsed = employeeVerify2FAAndLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "6c0b3a209555164f3253b228cbb1c877 ||| 84f0f9d460bd4f590302521326a7ab02d25500f4fef8a9dbe590043616673545ab5db4b17e9b6f9471cb8e8234f54195");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { assignedEmail, password, otp } = parsed.data;

			const result = await employeeVerify2FAAndLogin(assignedEmail, password, otp);

			// ✅ Send token via Authorization header
			reply.header("Authorization", `Bearer ${result.token}`);

			reply.header("x-auth-sign", "01324bbb113f8ab92014bb744ee907b7 ||| 72c96f034ab478a75bc2d6e7e9dd99cf4df0ca1be7893e2f5a90b57298797994d5563fe5058b6cffb1e512589532788b");
			return reply.code(200).send({
				status: "success",
				message: "Login successful",
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to verify 2FA and login employee"
			);
			reply.header("x-auth-sign", "c78867581a94d78f73483822aeac5e6e ||| 2d0ac34bf5275f2380f21206de554470bb5bd4e0d8d72afa759af397308e9e37f0112c8381b6fa10e06e0ceca9f1545f");
			return reply.code(400).send({
				status: "error",
				message: error.message || "2FA verification failed",
			});
		}
	});
});

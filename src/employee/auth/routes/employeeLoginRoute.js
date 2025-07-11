import { employeeLogin } from "../methods/employeeLogin.js";
import { employeeLoginSchema } from "../schemas/employeeLoginSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeLoginRoute(fastify) {
	fastify.post("/employee/login", async (request, reply) => {
		try {
			const parsed = employeeLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { assignedEmail, password } = parsed.data;

			const result = await employeeLogin({assignedEmail, password});

			// ✅ Send token via Authorization header
			reply.header("Authorization", `Bearer ${result.token}`);

			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(200).send({
				status: "success",
				message: "Login successful",
				authorization: `Bearer ${result.token}`
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to login employee"
			);
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(400).send({
				status: "error",
				message: error.message || "Login failed",
			});
		}
	});
});

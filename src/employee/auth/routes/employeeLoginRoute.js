import fp from "fastify-plugin";
import { employeeLogin } from "../methods/employeeLogin.js";
import { employeeLoginSchema } from "../schemas/employeeLoginSchema.js";

export default fp(async function employeeLoginRoute(fastify) {
	fastify.post("/employee/login", async (request, reply) => {
		try {
			const parsed = employeeLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "fb2e7ba856544b8e2eb3f9154679bb10 ||| 81f974b89221e1157be4caca0c8fe69af780eb842e7445d28149a289b9e35e41615b47f855edb6121a8c1cb1aa658c3c");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { assignedEmail, password } = parsed.data;

			const result = await employeeLogin({assignedEmail, password});

			// ✅ Send token via Authorization header
			reply.header("Authorization", `Bearer ${result.token}`);

			reply.header("x-auth-sign", "3c719730df67b5a47e41acedc55621ab ||| bca98c406277cf16aaa6f0e520b5ec80c64d203b22ec407d488a23683b219fa3a6103e608a68a3fe2e32f3e7f7ac7ffd");
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
			reply.header("x-auth-sign", "61642444549b2a90220404898d2f3ab5 ||| e4e68ae72ea6e7dbdd10329acc2c3aa8867ebc1e1e16020936eba7afeb5ced979457a1615947680b5774240426cdce42");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Login failed",
			});
		}
	});
});

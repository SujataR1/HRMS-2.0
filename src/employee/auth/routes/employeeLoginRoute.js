import { employeeLogin } from "../methods/employeeLogin.js";
import { employeeLoginSchema } from "../schemas/employeeLoginSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeLoginRoute(fastify) {
	fastify.post("/employee/login", async (request, reply) => {
		try {
			const parsed = employeeLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "Ia6W5S6zLILDDjK7TEQNKMrTH7bWIiUblde1Eng0ri4//eZrxr0XmCHd5a8x0IYKipRn42tfeWZ7vQ6OPHEj5A==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { assignedEmail, password } = parsed.data;

			const result = await employeeLogin({assignedEmail, password});

			// ✅ Send token via Authorization header
			reply.header("Authorization", `Bearer ${result.token}`);

			reply.header("x-auth-sign", "sc07jM4Bz/HM68rsUzc+UDAwRY/3eAgFQV563hbtlwAw3EvF+2SC9IIs6TzyBwwEwWOsI2KebaKf5G5gPUQATA==");
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
			reply.header("x-auth-sign", "QrSx/a9dTAfne4SwRCRvavH2gTL4PQRn+I2Z/5rGP8AgkqqlUR7AS0NHCNmYKTwAQ0Y4pfpeG7souG6mLy9JJA==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Login failed",
			});
		}
	});
});

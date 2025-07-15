import { hrCreateAnEmployee } from "../methods/hrCreateAnEmployee.js";
import { hrCreateAnEmployeeSchema } from "../schemas/hrCreateAnEmployeeSchema.js";

export default async function hrCreateAnEmployeeRoute(fastify) {
	fastify.post("/hr/employees/create", async (request, reply) => {
		const parsed = hrCreateAnEmployeeSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "b104af0250a4c922c06ef94e30247331 ||| b1eaf6f8c819059db29dba74a0af714853b52d9db6b53d22fd86b055451f23027c0089c5b94e51485c2e68ef8b303a00");
			return reply.code(400).send({
				error: "Validation failed",
				details: parsed.error.flatten(),
			});
		}

		try {
			const newEmployee = await hrCreateAnEmployee(parsed.data);
			reply.header("x-auth-sign", "b69bdc618e15c8964de4186dd6aae095 ||| 619f4ff555a0c73d17d8a59c33109765201516194d7f8ee5f63fad81d486fef9db7fac9a6a267d3b01fdff56b6cb5cfd");
			return reply.code(201).send({
				message: "Employee created successfully",
				employee: {
					id: newEmployee.id,
					name: newEmployee.name,
					employeeId: newEmployee.employeeId,
					assignedEmail: newEmployee.assignedEmail,
				},
			});
		} catch (err) {
			request.log.error({ err }, "❌ Failed to create employee");
			reply.header("x-auth-sign", "9783212ecd7ca20fda4bbf5f4611657b ||| 7e6df00c69aef6503c6aebd0f56446562f3eccc7fb57714c3b9a55fcf3990265d20e8da82c16b7764d09a41c0abe116d");
			return reply.code(500).send({
				error: err.message || "Internal Server Error",
			});
		}
	});
}

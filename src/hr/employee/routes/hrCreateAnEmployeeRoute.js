import { hrCreateAnEmployee } from "../methods/hrCreateAnEmployee.js";
import { hrCreateAnEmployeeSchema } from "../schemas/hrCreateAnEmployeeSchema.js";

export default async function hrCreateAnEmployeeRoute(fastify) {
	fastify.post("/hr/employees/create", async (request, reply) => {
		const parsed = hrCreateAnEmployeeSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "3a51f06477a2bed6fe52a93d7bb34440 ||| 847c6d8908759400659a3013caa27fda4c124d35704ee8a16647f75afaf249b9517cf026a12f6f97057c513a44a0b27f");
			return reply.code(400).send({
				error: "Validation failed",
				details: parsed.error.flatten(),
			});
		}

		try {
			const newEmployee = await hrCreateAnEmployee(parsed.data);
			reply.header("x-auth-sign", "db6a013aa776c5b2315ee8103a0a1514 ||| ef6f5a5b711d075fb94cf664cd9774875f86ed919012b97dc5cd8cad40432ba0780625fda11f28f75767ea1150b9ef0e");
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
			reply.header("x-auth-sign", "c0744e5f0d7656eedb22cf4318395643 ||| f6510d73f9ab1453d5d2144e541d0a7d0d590ba2cba688e198f2242cac0c9bf283eedc269d96d24985e5f4a2c14a5975");
			return reply.code(500).send({
				error: err.message || "Internal Server Error",
			});
		}
	});
}

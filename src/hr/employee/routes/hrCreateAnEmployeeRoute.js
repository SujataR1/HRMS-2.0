import { hrCreateAnEmployee } from "../methods/hrCreateAnEmployee.js";
import { hrCreateAnEmployeeSchema } from "../schemas/hrCreateAnEmployeeSchema.js";

export default async function hrCreateAnEmployeeRoute(fastify) {
	fastify.post("/hr/employees/create", async (request, reply) => {
		const parsed = hrCreateAnEmployeeSchema.safeParse(request.body);

		if (!parsed.success) {
			return reply.code(400).send({
				error: "Validation failed",
				details: parsed.error.flatten(),
			});
		}

		try {
			const newEmployee = await hrCreateAnEmployee(parsed.data);
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
			return reply.code(500).send({
				error: err.message || "Internal Server Error",
			});
		}
	});
}

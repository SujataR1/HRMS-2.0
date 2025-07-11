import { hrCreateAnEmployee } from "../methods/hrCreateAnEmployee.js";
import { hrCreateAnEmployeeSchema } from "../schemas/hrCreateAnEmployeeSchema.js";

export default async function hrCreateAnEmployeeRoute(fastify) {
	fastify.post("/hr/employees/create", async (request, reply) => {
		const parsed = hrCreateAnEmployeeSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "i+xTHIyBpTUfXSdtD03KziZnP0tOhHLMv0ATBcNCmx1F7c+zyiKO7UEclnOAmgGIAyNNtnODI4S0qt+MtHIBQw==");
			return reply.code(400).send({
				error: "Validation failed",
				details: parsed.error.flatten(),
			});
		}

		try {
			const newEmployee = await hrCreateAnEmployee(parsed.data);
			reply.header("x-auth-sign", "9ZruNSnK2qNa2kvZo/D53XxmdajmHSSJwPk621kSG7tF1LOA/rVR5YBVwUELkgNGz+I4OvTfPykkzMNvyyL/QA==");
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
			reply.header("x-auth-sign", "nF1kR+lTYc+kEzUak3JR+wZMH4ejO1R7gZCRra+DHzNlnP3a5MC98GsZx3QKtN7el0JRcazPK1XGejRTvhccBQ==");
			return reply.code(500).send({
				error: err.message || "Internal Server Error",
			});
		}
	});
}

import { hrUpdateAnEmployeeSchema } from "../schemas/hrUpdateAnEmployeeSchema.js";
import { hrUpdateAnEmployee } from "../../employee/methods/hrUpdateAnEmployee.js";

export default async function hrUpdateAnEmployeeRoute(fastify) {
	fastify.patch("/hr/update-employee", async (request, reply) => {
		const parsed = hrUpdateAnEmployeeSchema.safeParse(request.body);

		if (!parsed.success) {
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const updatedEmployee = await hrUpdateAnEmployee(parsed.data);
			return reply.code(200).send({
				status: "success",
				data: updatedEmployee,
			});
		} catch (err) {
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to update employee",
			});
		}
	});
}

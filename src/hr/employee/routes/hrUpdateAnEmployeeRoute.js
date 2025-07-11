import { hrUpdateAnEmployeeSchema } from "../schemas/hrUpdateAnEmployeeSchema.js";
import { hrUpdateAnEmployee } from "../../employee/methods/hrUpdateAnEmployee.js";

export default async function hrUpdateAnEmployeeRoute(fastify) {
	fastify.patch("/hr/update-employee", async (request, reply) => {
		const parsed = hrUpdateAnEmployeeSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "K8qz1p0BjETNoZsqcwLVTokJJS/cD0FFIasgummpRKRi5s2aA5ZXjZPkhsiQNKas8/ircwSbTCoggl97bdc2GQ==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const updatedEmployee = await hrUpdateAnEmployee(parsed.data);
			reply.header("x-auth-sign", "snlKpr/5uAMN5cG7Ou33b0qfHDELQ9kLtsnCDsUsE/VxlP/YY9b50pBHP0lXuXqezDWTHHsnKigCCEu/IA14BA==");
			return reply.code(200).send({
				status: "success",
				data: updatedEmployee,
			});
		} catch (err) {
			reply.header("x-auth-sign", "wwsJ0isFMGMeAIW2VAEfYcEEIXZTSBd3UC9I3DGXKzb/JCSmVj/zGlo7dk60XXz5tNAbqeVISqpcUWiQzUctVA==");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to update employee",
			});
		}
	});
}

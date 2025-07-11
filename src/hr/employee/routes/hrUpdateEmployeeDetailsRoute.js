import { hrUpdateEmployeeDetailsSchema } from "../schemas/hrUpdateEmployeeDetailsSchema.js";
import { hrUpdateEmployeeDetails } from "../../employee/methods/hrUpdateEmployeeDetails.js";

export default async function hrUpdateEmployeeDetailsRoute(fastify) {
	fastify.patch("/hr/update-employee-details", async (request, reply) => {
		const parsed = hrUpdateEmployeeDetailsSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "cc99a88985eaf66391ca4e0e2cacaa7b ||| 8ce199c4bd5ce398c962777dde736bf9d5b0f7dab480757bb3515644acedb2bb01785bc9dd4e00445762b5d5c1f9bea2");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const updated = await hrUpdateEmployeeDetails(parsed.data);
			reply.header("x-auth-sign", "65a9878c37267ffb189525244b329e15 ||| 522bd654e74fdd4ba3a605192cacb37269b50b144cadf64b81aab18d2b944ec2beace158dbcec78c8a8f17009192f07a");
			return reply.code(200).send({
				status: "success",
				data: updated,
			});
		} catch (err) {
			reply.header("x-auth-sign", "7eb5df1125ef7a1d5212392aa0a77d05 ||| 22f3c14479a38e5224d1ba3cf530635e6fe596e6b9717ad634c480e597e84cc1e7c0a8608bebc374c8e968f0b0ed0466");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to update employee details",
			});
		}
	});
}

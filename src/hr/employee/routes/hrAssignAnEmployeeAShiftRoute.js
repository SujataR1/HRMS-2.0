import { hrAssignAnEmployeeAShiftSchema } from "../schemas/hrAssignAnEmployeeAShiftSchema.js";
import { hrAssignAnEmployeeAShift } from "../../employee/methods/hrAssignAnEmployeeAShift.js";

export default async function hrAssignAnEmployeeAShiftRoute(fastify) {
	fastify.patch("/hr/assign-shift", async (request, reply) => {
		const parsed = hrAssignAnEmployeeAShiftSchema.safeParse(request.body);

		if (!parsed.success) {
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const updated = await hrAssignAnEmployeeAShift(parsed.data);
			return reply.code(200).send({
				status: "success",
				data: updated,
			});
		} catch (err) {
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to assign shift",
			});
		}
	});
}

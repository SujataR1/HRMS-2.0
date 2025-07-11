import { hrAssignAnEmployeeAShiftSchema } from "../schemas/hrAssignAnEmployeeAShiftSchema.js";
import { hrAssignAnEmployeeAShift } from "../../employee/methods/hrAssignAnEmployeeAShift.js";

export default async function hrAssignAnEmployeeAShiftRoute(fastify) {
	fastify.patch("/hr/assign-shift", async (request, reply) => {
		const parsed = hrAssignAnEmployeeAShiftSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "WAYUxyqoDOSpFtuobPmTsi/rd671rLHn5HFQ0Q53NZuLv9HN3Hyp7sfEJ6Uy/jvX+hTDa6uJNSKLyDlqQ+c3bg==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const updated = await hrAssignAnEmployeeAShift(parsed.data);
			reply.header("x-auth-sign", "J7aNMFCiEwfaJJc33Uid0oLJtKsIAjUaed85jAFeD0sjkKXbJcLD+K0inmKUa4UEN0vWisfFMsdcO2WwFTB8lw==");
			return reply.code(200).send({
				status: "success",
				data: updated,
			});
		} catch (err) {
			reply.header("x-auth-sign", "+/RA7MH6G00ctgFU+jwItcMB0ceZtTfaz1mA8uIAaI1N4lSWZeUxnD35OUv5GKtyHZTKPnGWKZG4fURLF57cYg==");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to assign shift",
			});
		}
	});
}

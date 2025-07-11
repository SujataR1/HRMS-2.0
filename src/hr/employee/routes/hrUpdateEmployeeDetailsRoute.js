import { hrUpdateEmployeeDetailsSchema } from "../schemas/hrUpdateEmployeeDetailsSchema.js";
import { hrUpdateEmployeeDetails } from "../../employee/methods/hrUpdateEmployeeDetails.js";

export default async function hrUpdateEmployeeDetailsRoute(fastify) {
	fastify.patch("/hr/update-employee-details", async (request, reply) => {
		const parsed = hrUpdateEmployeeDetailsSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "ap3R7GVzESkZQIIELqLCU8ZeKOhV4IAxVojpH3SzMD1BDb3+flfHOabGG8bnNuN9gUUkQCDVibYMnf1qcpf/YQ==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const updated = await hrUpdateEmployeeDetails(parsed.data);
			reply.header("x-auth-sign", "RpZgEO6+Klf46T6w3Khj65u4radD41hQ019d+0WyyM/gmpryOb0x0H+HF52AJN3+BeJAN72GHvh90nBkeoMcwQ==");
			return reply.code(200).send({
				status: "success",
				data: updated,
			});
		} catch (err) {
			reply.header("x-auth-sign", "6hSlna5M2mYmKwcbMzMfddEXrctwgj57+C4k/XbYzkOY8aomTo3pv+YFw/Sf79cleqJY3aS5jY8ABnPgmt2L0Q==");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to update employee details",
			});
		}
	});
}

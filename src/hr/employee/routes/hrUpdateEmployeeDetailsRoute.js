import { hrUpdateEmployeeDetailsSchema } from "../schemas/hrUpdateEmployeeDetailsSchema.js";
import { hrUpdateEmployeeDetails } from "../../employee/methods/hrUpdateEmployeeDetails.js";

export default async function hrUpdateEmployeeDetailsRoute(fastify) {
	fastify.patch("/hr/update-employee-details", async (request, reply) => {
		const parsed = hrUpdateEmployeeDetailsSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "uqVujoiYBtmv3C2nA+yuO+YWHj43aa+MNsExrR8kjKqO9ma5cC3cYSXKuZwWj6YfkW9hI5RN0/ppvtvIwQWYvQ==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const updated = await hrUpdateEmployeeDetails(parsed.data);
			reply.header("x-auth-sign", "t0EQ6UBFKjIZNz9cIF9lPjrie32AmYT7/aNDrvVFB0wQY39kqcsPT9Q49kIZGxQNgJs0C1bQmKGkpRIffdGJbg==");
			return reply.code(200).send({
				status: "success",
				data: updated,
			});
		} catch (err) {
			reply.header("x-auth-sign", "xH+LWhklFBMhqYajMbMe6Qc6LXfWyRWU17gQL6zUupHk32sTkW7FRWVMGda0e5ROhDVsEFIj4iUNIcwXxeTy5Q==");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to update employee details",
			});
		}
	});
}

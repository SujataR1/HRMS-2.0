import { hrCreateEmployeeDetailsSchema } from "../schemas/hrCreateEmployeeDetailsSchema.js";
import { hrCreateEmployeeDetails } from "../../employee/methods/hrCreateEmployeeDetails.js";

export default async function hrCreateEmployeeDetailsRoute(fastify) {
	fastify.post("/hr/create-employee-details", async (request, reply) => {
		const parsed = hrCreateEmployeeDetailsSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const createdDetails = await hrCreateEmployeeDetails(parsed.data);
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(201).send({
				status: "success",
				data: createdDetails,
			});
		} catch (err) {
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to create employee details",
			});
		}
	});
}

import { hrCreateEmployeeDetailsSchema } from "../schemas/hrCreateEmployeeDetailsSchema.js";
import { hrCreateEmployeeDetails } from "../../employee/methods/hrCreateEmployeeDetails.js";

export default async function hrCreateEmployeeDetailsRoute(fastify) {
	fastify.post("/hr/create-employee-details", async (request, reply) => {
		const parsed = hrCreateEmployeeDetailsSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "6acee0619c7a8b88ae5643ea551a1300 ||| 254cccb10e7a96c241d0a4d3e399a3b83ae8bd8cc009526bdfe2c865a0bd116836da12071263ea41f797089244f68ac9");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const createdDetails = await hrCreateEmployeeDetails(parsed.data);
			reply.header("x-auth-sign", "0af5993af8b739c4ac5ae853c3c25fd3 ||| d7b11273d820426f0dee2c36653d5b870564bb5f2d4c478de904576217ea3e5c9916edef58f368969153ee7c16a45a5c");
			return reply.code(201).send({
				status: "success",
				data: createdDetails,
			});
		} catch (err) {
			reply.header("x-auth-sign", "40c3186eb6329a897249b93ed269717f ||| 513972cb9e32f61bcf5ecbb8cbed619acf31dc386ad8ff87741836f26a35d8d3225d99ff2e63ab522acc9679fef61b96");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to create employee details",
			});
		}
	});
}

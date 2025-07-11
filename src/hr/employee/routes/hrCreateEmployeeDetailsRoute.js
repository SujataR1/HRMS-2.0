import { hrCreateEmployeeDetailsSchema } from "../schemas/hrCreateEmployeeDetailsSchema.js";
import { hrCreateEmployeeDetails } from "../../employee/methods/hrCreateEmployeeDetails.js";

export default async function hrCreateEmployeeDetailsRoute(fastify) {
	fastify.post("/hr/create-employee-details", async (request, reply) => {
		const parsed = hrCreateEmployeeDetailsSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "e5E8ck/dVNv2cQ/4h+SfK0rsHzOU/y33Kop5Vveo08XjGckm49UzGTNtFAb0b3Ml5tgNIZEgyNMy03NJ3VW7LQ==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const createdDetails = await hrCreateEmployeeDetails(parsed.data);
			reply.header("x-auth-sign", "TkaDlSqwPporQquY+0IQYSACnKsr9r0H3MvOPqLLrMog9RRZpinhUW9/h51295po42ZT04Cj5njgrrJ8I3yBQg==");
			return reply.code(201).send({
				status: "success",
				data: createdDetails,
			});
		} catch (err) {
			reply.header("x-auth-sign", "e/QZGbokCPGqjZ2Ypz91ULWTGxT2dzM5TAoYrYcnqQxNeeJQ1Jwz0jewbXZBq+82g3EgrV0ImfT+HEft+5EX1A==");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to create employee details",
			});
		}
	});
}

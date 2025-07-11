import { hrCreateAShiftSchema } from "../schemas/hrCreateAShiftSchema.js";
import { hrCreateAShift } from "../../shifts/methods/hrCreateAShift.js";

export default async function hrCreateAShiftRoute(fastify) {
	fastify.post("/hr/create-shift", async (request, reply) => {
		const parsed = hrCreateAShiftSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "5y2Inz8P3hTnTT/grtydMv4wqEjzvUksI+J/3LmduWGP0/sM0tfgc8RC+jMZ4S5CBYR8+SUwIIr0Bf3ECapb4Q==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const newShift = await hrCreateAShift(parsed.data);
			reply.header("x-auth-sign", "SQnWnjoBDH9p2cpcQAWuEWyp29R4Nn2WG8+HeARfs4AJQsRdOhRMzvyRocxm4ErOWQnXjXXOlrcxyqYJEz+giQ==");
			return reply.code(201).send({
				status: "success",
				data: newShift,
			});
		} catch (err) {
			reply.header("x-auth-sign", "0KeqKjty7+9/uL+vMsmKDg1KdFsQ/ZOrXdZWziuS4a1nWC/OhJkBEWQP2z/Mki8OWsBj09i+ZohLSLk6MfuVVA==");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Internal Server Error",
			});
		}
	});
}

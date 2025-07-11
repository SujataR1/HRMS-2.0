import { hrCreateEmployeeDetailsSchema } from "../schemas/hrCreateEmployeeDetailsSchema.js";
import { hrCreateEmployeeDetails } from "../../employee/methods/hrCreateEmployeeDetails.js";

export default async function hrCreateEmployeeDetailsRoute(fastify) {
	fastify.post("/hr/create-employee-details", async (request, reply) => {
		const parsed = hrCreateEmployeeDetailsSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "ZQD6D5YCLkbxhtFzBdvd0I8LP5mPhkaxWS0b+W4Q7wux6pZkqdCeRv8OhWrI9955+0smoiRzrvS+Rfg6ix5d8w==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const createdDetails = await hrCreateEmployeeDetails(parsed.data);
			reply.header("x-auth-sign", "Ip8yBye7A2iBKrFYky6Qu/LXC37mRvCs5eaKbhVeKKDGHn9ZHWNiG3Hv0F57njAf0Phcwua+1WT7QVYzN4FJYg==");
			return reply.code(201).send({
				status: "success",
				data: createdDetails,
			});
		} catch (err) {
			reply.header("x-auth-sign", "512cuOcI3Q8jh+pWl7Z3asu2FM7MX8xPQTqjINec7CFBxNKukQ49DaxM5SGXywKSvIxW8eZuktGSFMBDj1EXrw==");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to create employee details",
			});
		}
	});
}

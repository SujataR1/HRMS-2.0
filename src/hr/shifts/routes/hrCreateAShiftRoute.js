import { hrCreateAShiftSchema } from "../schemas/hrCreateAShiftSchema.js";
import { hrCreateAShift } from "../../shifts/methods/hrCreateAShift.js";

export default async function hrCreateAShiftRoute(fastify) {
	fastify.post("/hr/create-shift", async (request, reply) => {
		const parsed = hrCreateAShiftSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "0d65df656f19c5e3596cdfe326b3f511 ||| 166759b29562a4edffb659f9f510534a1f2ff80c8000c24624444e63cb855dbf517360d9d65915198141ddb664f2fc28");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const newShift = await hrCreateAShift(parsed.data);
			reply.header("x-auth-sign", "0cd73029577fa060edd9ca04913cbca1 ||| 2cb30bb1db983b3f964f35c578e4d35da71753499de5045b21f93e8b0109eb355ea0d0ae444a57208785e7f54d9d619d");
			return reply.code(201).send({
				status: "success",
				data: newShift,
			});
		} catch (err) {
			reply.header("x-auth-sign", "7a186f0eb384c84c73cd6c957b7d6b74 ||| 28844d69171c0c8c7a2e3c07a46864d701da9980c77a8eb048f4dce135649a5b6bb57ac6b023ea924caf0141b1e53f5d");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Internal Server Error",
			});
		}
	});
}

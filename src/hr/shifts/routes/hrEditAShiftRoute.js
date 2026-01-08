import { hrEditAShiftSchema } from "../schemas/hrEditAShiftSchema.js";
import { hrEditAShift } from "../methods/hrEditAShift.js";

export default async function hrEditAShiftRoute(fastify) {
	fastify.patch("/hr/edit-shift", async (request, reply) => {
		const parsed = hrEditAShiftSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header(
				"x-auth-sign",
				"f0a9d0c55b5d2d47b5d7e3d9a2d7b1c1 ||| 2b88d97e7f9e8d3e0d4d7d7f4a1a1f1b"
			);
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const updated = await hrEditAShift(parsed.data);
			reply.header(
				"x-auth-sign",
				"7e3fd6c1a22b5e00c1c9a8a6d4c3b2a1 ||| 9a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d"
			);
			return reply.code(200).send({
				status: "success",
				data: updated,
			});
		} catch (err) {
			reply.header(
				"x-auth-sign",
				"1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e ||| e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1"
			);
			return reply.code(500).send({
				status: "error",
				message: err.message || "Internal Server Error",
			});
		}
	});
}

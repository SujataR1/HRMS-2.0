import { hrCreateAShiftSchema } from "../schemas/hrCreateAShiftSchema.js";
import { hrCreateAShift } from "../../shifts/methods/hrCreateAShift.js";

export default async function hrCreateAShiftRoute(fastify) {
	fastify.post("/hr/create-shift", async (request, reply) => {
		const parsed = hrCreateAShiftSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "34gZQoWQfvCSTEP5314zSXqWtyPDyxvhuYeNrBIfpQBBEpa9ulvXiMG6oNsumz7cTkzYjFuGoPX9E49lmhZ3ig==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const newShift = await hrCreateAShift(parsed.data);
			reply.header("x-auth-sign", "1GOFlGUVxbE1+8kFTyMnbg3LncWLEY9WuDxeekaeKvhTRY2aGt9xapiOdod6R/a07NWEhsyDjO3ixWdW3rHP1Q==");
			return reply.code(201).send({
				status: "success",
				data: newShift,
			});
		} catch (err) {
			reply.header("x-auth-sign", "+e0VAYulcb/WydWgVVCu3fg62Yo5YKLI/QYAKFrznKvdkZXE5UChaDQtdjoJgzzIsZaETFI60/lGl856OWURgA==");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Internal Server Error",
			});
		}
	});
}

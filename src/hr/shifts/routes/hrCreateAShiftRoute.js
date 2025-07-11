import { hrCreateAShiftSchema } from "../schemas/hrCreateAShiftSchema.js";
import { hrCreateAShift } from "../../shifts/methods/hrCreateAShift.js";

export default async function hrCreateAShiftRoute(fastify) {
	fastify.post("/hr/create-shift", async (request, reply) => {
		const parsed = hrCreateAShiftSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "dc2879dd736383ecaa84de78faf285da ||| 26d3e11b07b767c924d9f24a366c9098e53c025c0b9a4d65b85f0971af49d0c5e27ec4f84fed7f1493d61bf10ca0ab9a");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const newShift = await hrCreateAShift(parsed.data);
			reply.header("x-auth-sign", "23008ca4550829399d0a8b34a2a22903 ||| 4a82dd8c6448db36be1e66300abc4963511664bd234f807e4a4e6c94a5d9a1c5434cfa16e4a8cd5fe804377b00847152");
			return reply.code(201).send({
				status: "success",
				data: newShift,
			});
		} catch (err) {
			reply.header("x-auth-sign", "b40123c1dd49e277e5104c06fb72ba39 ||| 7bb4649c53abf7e6d771b321580cbf123c6f30a32be14e57972342b2de4ca30dc28ed22ad29d5e730198ebe6bac57e5e");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Internal Server Error",
			});
		}
	});
}

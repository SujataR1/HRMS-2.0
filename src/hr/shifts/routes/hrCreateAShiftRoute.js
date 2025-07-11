import { hrCreateAShiftSchema } from "../schemas/hrCreateAShiftSchema.js";
import { hrCreateAShift } from "../../shifts/methods/hrCreateAShift.js";

export default async function hrCreateAShiftRoute(fastify) {
	fastify.post("/hr/create-shift", async (request, reply) => {
		const parsed = hrCreateAShiftSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.format(),
			});
		}

		try {
			const newShift = await hrCreateAShift(parsed.data);
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(201).send({
				status: "success",
				data: newShift,
			});
		} catch (err) {
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(500).send({
				status: "error",
				message: err.message || "Internal Server Error",
			});
		}
	});
}

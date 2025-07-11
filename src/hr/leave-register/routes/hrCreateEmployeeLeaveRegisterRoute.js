import fp from "fastify-plugin";
import { hrCreateEmployeeLeaveRegister } from "../methods/hrCreateEmployeeLeaveRegister.js";
import { hrCreateEmployeeLeaveRegisterSchema } from "../schemas/hrCreateEmployeeLeaveRegisterSchema.js";

export default fp(async function hrCreateEmployeeLeaveRegisterRoute(fastify) {
	fastify.post("/hr/create-leave-register", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			const parsed = hrCreateEmployeeLeaveRegisterSchema.safeParse(request.body);
			if (!parsed.success) {
				reply.header("x-auth-sign", "37b17778f65eb7fde001ac528a76c27a ||| d3926a9ffe8a9bcd656ebd80f554d13c6a205035fe9f0ab25add441a94e7165b9c1a69571adfcae326eae3ec54cb80ff");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await hrCreateEmployeeLeaveRegister(authHeader, parsed.data);

			reply.header("x-auth-sign", "cf46efd4395c874c27971a0244871366 ||| e8489f95f84c2cb44bc5a5e9a6cdee5b7b69318afc1feeca701d5944245f92d66e9c70ed0bf1e0d7b333e43432f4f9f0");
			return reply.code(200).send({
				status: "success",
				message: result.message,
				data: result.register,
			});
		} catch (err) {
			request.log.error({ err }, "🔥 Failed to create leave register");
			reply.header("x-auth-sign", "f536caaadeb92133728d054f110d5eb9 ||| 37281ee7994e554e01909c46c6b045595b1898d72f6b8f73421128158707cfeb3930da59d723ddb73901c27838e29077");
			return reply.code(400).send({
				status: "error",
				message: err.message || "Unexpected error occurred",
			});
		}
	});
});

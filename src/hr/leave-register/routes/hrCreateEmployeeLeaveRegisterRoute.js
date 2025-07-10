import fp from "fastify-plugin";
import { hrCreateEmployeeLeaveRegister } from "../methods/hrCreateEmployeeLeaveRegister.js";
import { hrCreateEmployeeLeaveRegisterSchema } from "../schemas/hrCreateEmployeeLeaveRegisterSchema.js";

export default fp(async function hrCreateEmployeeLeaveRegisterRoute(fastify) {
	fastify.post("/hr/create-leave-register", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			const parsed = hrCreateEmployeeLeaveRegisterSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await hrCreateEmployeeLeaveRegister(authHeader, parsed.data);

			return reply.code(200).send({
				status: "success",
				message: result.message,
				data: result.register,
			});
		} catch (err) {
			request.log.error({ err }, "🔥 Failed to create leave register");
			return reply.code(400).send({
				status: "error",
				message: err.message || "Unexpected error occurred",
			});
		}
	});
});

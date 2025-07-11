import fp from "fastify-plugin";
import { hrCreateEmployeeLeaveRegister } from "../methods/hrCreateEmployeeLeaveRegister.js";
import { hrCreateEmployeeLeaveRegisterSchema } from "../schemas/hrCreateEmployeeLeaveRegisterSchema.js";

export default fp(async function hrCreateEmployeeLeaveRegisterRoute(fastify) {
	fastify.post("/hr/create-leave-register", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			const parsed = hrCreateEmployeeLeaveRegisterSchema.safeParse(request.body);
			if (!parsed.success) {
				reply.header("x-auth-sign", "xaxRmLyGJERbBwcXALBwwGlxvY7onufVHSmusf1HUHkkRZIKHHjtVCKmACMhetF3VW8y9VIwj5AhnpPqVx+Kcg==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await hrCreateEmployeeLeaveRegister(authHeader, parsed.data);

			reply.header("x-auth-sign", "ZkYzyzeEm+wqJoHAk2zBnCO1qeTiyBBk9AJipf1W4yGg8QcPHRyVm3xnXxcGK+Kvp4ZZLIWmofjktR/hmqIyHQ==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
				data: result.register,
			});
		} catch (err) {
			request.log.error({ err }, "🔥 Failed to create leave register");
			reply.header("x-auth-sign", "sec1ABRaTX1BwAt7mocxweCCIc3ePOXDM4Iu2HTdNQiMXrP8HzZ5ro+HJZ2mOLoNi9EREMn4xMHd4et06jiK4A==");
			return reply.code(400).send({
				status: "error",
				message: err.message || "Unexpected error occurred",
			});
		}
	});
});

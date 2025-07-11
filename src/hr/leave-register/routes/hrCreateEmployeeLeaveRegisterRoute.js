import fp from "fastify-plugin";
import { hrCreateEmployeeLeaveRegister } from "../methods/hrCreateEmployeeLeaveRegister.js";
import { hrCreateEmployeeLeaveRegisterSchema } from "../schemas/hrCreateEmployeeLeaveRegisterSchema.js";

export default fp(async function hrCreateEmployeeLeaveRegisterRoute(fastify) {
	fastify.post("/hr/create-leave-register", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			const parsed = hrCreateEmployeeLeaveRegisterSchema.safeParse(request.body);
			if (!parsed.success) {
				reply.header("x-auth-sign", "b46a78374ebc2455f612904c59a469bf ||| 8e5b93efb7732d507aed0b9d6c5dff6f9ecaf2330d1818cfb6559ee1ec922eedc99093ce28b763405c0ed72b7b72f72b");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await hrCreateEmployeeLeaveRegister(authHeader, parsed.data);

			reply.header("x-auth-sign", "9991db4a4c7127ef4b5cad8e45b98e94 ||| 86f115a302de514c42d6c94c417e77959b5532fa127f9d055895f0c940e0d58551ab1d6c8b8fbb864a1fbe6ea5808ffc");
			return reply.code(200).send({
				status: "success",
				message: result.message,
				data: result.register,
			});
		} catch (err) {
			request.log.error({ err }, "🔥 Failed to create leave register");
			reply.header("x-auth-sign", "919b8eddfc6a0c10f46a46d2f7c91ae7 ||| 31d65e30700fb475c37a9a582239763afe46654e9c62111763f9ea4758e5e54ca129e4de3d51f196416eb4f25b60978c");
			return reply.code(400).send({
				status: "error",
				message: err.message || "Unexpected error occurred",
			});
		}
	});
});

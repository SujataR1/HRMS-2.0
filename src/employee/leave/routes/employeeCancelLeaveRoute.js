import fp from "fastify-plugin";
import { employeeCancelLeave } from "../methods/employeeCancelLeave.js";
import { employeeCancelLeaveSchema } from "../schemas/employeeCancelLeaveSchema.js";

export default fp(async function employeeCancelLeaveRoute(fastify) {
	fastify.post("/employee/leave/cancel", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "2c56d1db139722494d316fe9b34e32fd ||| a35f58ccc43e19fd28716a126387c94d44e497d91749c014932c2a507bb316580b4b183575870a849619dcb50c34f379");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeCancelLeaveSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "2966381727b4fd8e91cc8b52c3325ccc ||| 836b378d80d4eca367f9fda950748b4c360d9b3a6d75b0ee51a36b20be73711a135975fe2284bffd142acc014b3c62ea");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await employeeCancelLeave(authHeader, parsed.data);

			reply.header("x-auth-sign", "e69992e965e70fcea531679a74edc178 ||| c60b16703bdbc579b5ab0c69c2b6902be0463e8b34ca76116ef8c403427a42c053b8016bbfaaf2debe6c6bed20e2ff3c");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to cancel leave");
			reply.header("x-auth-sign", "30f56f42eba4e2cca165357a7f6049df ||| 0cdf90e3c42043fa6888a25ef1b6eb5b2fbf3e288a2320eb2461b3bc4a3a450699e6b3f141513ada24cc428daaf79b72");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Could not cancel leave",
			});
		}
	});
});

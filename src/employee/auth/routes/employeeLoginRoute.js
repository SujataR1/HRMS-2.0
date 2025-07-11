import { employeeLogin } from "../methods/employeeLogin.js";
import { employeeLoginSchema } from "../schemas/employeeLoginSchema.js";
import fp from "fastify-plugin";

export default fp(async function employeeLoginRoute(fastify) {
	fastify.post("/employee/login", async (request, reply) => {
		try {
			const parsed = employeeLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "cuOw1D5ROLX2B2umVPLsevRsNK2GXMXNfxxMZhttZCCxd36dHIlJHhY8WEYHoXDzutGj0OiDJXT6NTYgfYsUrQ==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const { assignedEmail, password } = parsed.data;

			const result = await employeeLogin({assignedEmail, password});

			// ✅ Send token via Authorization header
			reply.header("Authorization", `Bearer ${result.token}`);

			reply.header("x-auth-sign", "iLxYrfVGr+wRaHpW2lhp9V5fwLDcHIrWZDgCcUCtLudcH0EG99/IWzLJ2rtUUOJf68Aev6DuGbfoIOQQvuDZbQ==");
			return reply.code(200).send({
				status: "success",
				message: "Login successful",
				authorization: `Bearer ${result.token}`
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to login employee"
			);
			reply.header("x-auth-sign", "yDcgx/EYRsD4mStxHvtBIV1OBKtCf41XlLEGC75NkBkwv26+PtC6gD8IKV6uW0tumqi0yV5nT6Yl2X76KVi+cg==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Login failed",
			});
		}
	});
});

import fp from "fastify-plugin";
import { employeeCancelLeave } from "../methods/employeeCancelLeave.js";
import { employeeCancelLeaveSchema } from "../schemas/employeeCancelLeaveSchema.js";

export default fp(async function employeeCancelLeaveRoute(fastify) {
	fastify.post("/employee/leave/cancel", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "R9s7zQXzh+I3gso2dMsf3dPlyDR4jRDXYZZdwRcnUIolpxAA3QclBZ3DgWBOFLa7OSb6YfzD8BIxmThO4V1E5g==");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeCancelLeaveSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "gmnje4bqpby1UaYX9QWK+bxMcuB0SFHwVa11MsKyiJRsusf35Y599qIKqkVZjQEpzJI+KWtIYpmeV2eH4/OSIw==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await employeeCancelLeave(authHeader, parsed.data);

			reply.header("x-auth-sign", "B1Q5hA6Zb1j7koJKy8Ka5THw2E8XoErbvNhfApkdNPPvHQB5A9DquqySVk+Fff7FWg12aEEo9noiPDcoDmoFVg==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to cancel leave");
			reply.header("x-auth-sign", "ASbPbrxsJt+l01ZqoFi/d80+rdV2BHmnh6vmbSiMOa1Hgwr4zASe80OyzlseCAcEWLoyYMAs8HjQkwdL9Wrssw==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Could not cancel leave",
			});
		}
	});
});

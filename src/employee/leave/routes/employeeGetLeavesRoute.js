import fp from "fastify-plugin";
import { employeeGetLeaves } from "../methods/employeeGetLeaves.js";
import { employeeGetLeavesSchema } from "../schemas/employeeGetLeavesSchema.js";

export default fp(async function employeeGetLeavesRoute(fastify) {
	fastify.post("/employee/leave/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "IYknk5PJzpn4Z//8aOI1lnDuCS55WLYRU4+K+CnTCbEQDq8smirz64XAbN3v/eeOVOXzxiVfcUJW/cwzxtZC9g==");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeGetLeavesSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "pwsbg37uMUtt88bU8trLexwMjDlm0BH8jSk1IU6/IX8EWhjD3lsvKcSd/B09fr3Ysmk20vLat8XkSsgBZ5BiWQ==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await employeeGetLeaves(authHeader, parsed.data);

			reply.header("x-auth-sign", "0LzcqkjOUnMQIC8rol9oarWpoMITC1MIZLxySo5eFbYwPIyGumyXAGamuE3/FdqhQBz0DRGJn586aOSjAUBZvg==");
			return reply.code(200).send({
				status: "success",
				data: result,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch employee leaves");
			reply.header("x-auth-sign", "ehEbQPF7/XdXB4u5AEjeQEqtRhWJWO7o6SbufAOsQpVDCr8G7nWXsfAX4ysmgQ+hg8iRmXvw3Ewzt3MttUhymg==");
			return reply.code(500).send({
				status: "error",
				message: error.message || "Could not retrieve leave records",
			});
		}
	});
});

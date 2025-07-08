import fp from "fastify-plugin";
import { employeeGetLeaves } from "../methods/employeeGetLeaves.js";
import { employeeGetLeavesSchema } from "../schemas/employeeGetLeavesSchema.js";

export default fp(async function employeeGetLeavesRoute(fastify) {
	fastify.post("/employee/leave/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeGetLeavesSchema.safeParse(request.body);

		if (!parsed.success) {
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await employeeGetLeaves(authHeader, parsed.data);

			return reply.code(200).send({
				status: "success",
				data: result,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch employee leaves");
			return reply.code(500).send({
				status: "error",
				message: error.message || "Could not retrieve leave records",
			});
		}
	});
});

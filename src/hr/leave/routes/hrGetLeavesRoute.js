import fp from "fastify-plugin";
import { hrGetLeaves } from "../methods/hrGetLeaves.js";
import { hrGetLeavesSchema } from "../schemas/hrGetLeavesSchema.js";

export default fp(async function hrGetLeavesRoute(fastify) {
	fastify.post("/hr/leave/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "fqIWX90/IGv4Bdv3kcUcIPyy9ZCLyvlky2P1pxrYWdKSCLBSnKdrvxJDr343CdbhX6pEuDVwS19JHtlYJEgT4A==");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = hrGetLeavesSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "7zPFVpHqrih9XmRL9CMXiCp6iuwtSdv/pXIthJiD99oogcB63aWqjpK27Bodi5Gaja1dsx4QVgJAGbVaRsy3UA==");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await hrGetLeaves(authHeader, parsed.data);

			reply.header("x-auth-sign", "XolYJMM2rDbERiMhNPivCDjNTKWOfOb7KoyNCJcK3p31w/yZ7BFtL0oRjeKRwcWUdlXIwrAm6PdUF6DQC+FCdQ==");
			return reply.code(200).send({
				status: "success",
				data: result,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch leaves for HR");
			reply.header("x-auth-sign", "lhYW/M005T2xcqDtbnMyQx/VQR6Qx0tRm3JXp5JgFl5ITTa9FeJ2L7Uan00rx96Bi7CNgB7TOQvTcDXBqJ/YmA==");
			return reply.code(500).send({
				status: "error",
				message: error.message || "Could not retrieve leave records",
			});
		}
	});
});

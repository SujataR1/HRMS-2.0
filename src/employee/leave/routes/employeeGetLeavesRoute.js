import fp from "fastify-plugin";
import { employeeGetLeaves } from "../methods/employeeGetLeaves.js";
import { employeeGetLeavesSchema } from "../schemas/employeeGetLeavesSchema.js";

export default fp(async function employeeGetLeavesRoute(fastify) {
	fastify.post("/employee/leave/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "9d84114da9d9ae25a310db1d28bbb86a ||| 55a4d70bc20d88e120577501f35cbb8598be36c716a656099d6f78c9d823a308ea21816d5c79008c13dd801e7626c8ce");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeGetLeavesSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "173814bd319b92433326b8ca6dc64f55 ||| d0dc5c5dbe0c8e3837a0474ae37a9d5f06a6eee7a607c5b547444662424f2e840e7b084786aea3f0df4650ac7ed8218f");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await employeeGetLeaves(authHeader, parsed.data);

			reply.header("x-auth-sign", "0a93cd56aed451754a2762ec0d84aef2 ||| 403cae2086558de8b0f3d8c0b6cce211b2f201bd036bc47b56d78e9d1717e8fef24736d32a1888072b7d0eb77942932b");
			return reply.code(200).send({
				status: "success",
				data: result,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch employee leaves");
			reply.header("x-auth-sign", "0cf0a354bcb2c0f965ea6e11cf2d0555 ||| 892ebdee5349503d39df734263125c8b09cce74e830a6c1b01b9f72bd257edb5e0e4b1e8babca7d09299aa7ed86d7cd8");
			return reply.code(500).send({
				status: "error",
				message: error.message || "Could not retrieve leave records",
			});
		}
	});
});

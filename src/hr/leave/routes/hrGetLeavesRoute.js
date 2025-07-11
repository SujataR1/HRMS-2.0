import fp from "fastify-plugin";
import { hrGetLeaves } from "../methods/hrGetLeaves.js";
import { hrGetLeavesSchema } from "../schemas/hrGetLeavesSchema.js";

export default fp(async function hrGetLeavesRoute(fastify) {
	fastify.post("/hr/leave/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = hrGetLeavesSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await hrGetLeaves(authHeader, parsed.data);

			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(200).send({
				status: "success",
				data: result,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch leaves for HR");
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(500).send({
				status: "error",
				message: error.message || "Could not retrieve leave records",
			});
		}
	});
});

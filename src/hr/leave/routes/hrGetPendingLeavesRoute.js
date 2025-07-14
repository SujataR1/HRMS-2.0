import fp from "fastify-plugin";
import { hrGetPendingLeaves } from "../methods/hrGetPendingLeaves.js";

export default fp(async function hrGetPendingLeavesRoute(fastify) {
	fastify.get("/hr/leaves/pending", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "838f61ee7ca8ad8a8e157504b880f186 ||| aeb0f9821d9fc0a618e04700f91f71ea9fe56c626f95a2cd0ca72aed5975a80b9fa2e7fa52171320196a8c765bfb9c33");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		try {
			const result = await hrGetPendingLeaves(authHeader);

			reply.header("x-auth-sign", "828cb1ca89fac2c4be5216503d61958b ||| b0ede9afe02bd7463a5cdfb0a9099f90e22e85c9970f5535a769b12f04df7e8b21781ed1284db1a6d926b96318619889");
			return reply.code(200).send({
				status: "success",
				data: result,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch pending leaves");
			reply.header("x-auth-sign", "8ba1249360e5d1f2e1fb5494d8a661e5 ||| ca0296e55a58243b8981dd0a591072a177ec7ca9211f862e6574d619d679692a6d0974eda67621766979c0a8d2977849");
			return reply.code(500).send({
				status: "error",
				message: error.message || "Could not retrieve pending leave records",
			});
		}
	});
});

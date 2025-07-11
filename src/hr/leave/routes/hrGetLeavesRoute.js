import fp from "fastify-plugin";
import { hrGetLeaves } from "../methods/hrGetLeaves.js";
import { hrGetLeavesSchema } from "../schemas/hrGetLeavesSchema.js";

export default fp(async function hrGetLeavesRoute(fastify) {
	fastify.post("/hr/leave/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "bd7f889e49c4934c73b4b7cdd9426413 ||| cd34dd7d4a7d2ee40d553aac09b2cd89f97f250ba4078c78d80da4594a617f9cff9a433752231f7c4f53b9112e05454b");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = hrGetLeavesSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "d70f75770837fc3b2434bd680c989b9e ||| 391641b16b2cc65325f80bc652eaa0bc00d1314a6b8525d335f45f9ca1a543f0c1895e40347d003306f780c008ba9ca6");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const result = await hrGetLeaves(authHeader, parsed.data);

			reply.header("x-auth-sign", "d8d054c620db261e70d48138bfc291df ||| bf597eed91f2da76b65cb1f0829f67cae6a1c352ac07e64054baed02742562f76537d965e2c7095140608f96d24e004f");
			return reply.code(200).send({
				status: "success",
				data: result,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch leaves for HR");
			reply.header("x-auth-sign", "3e62e4c663e45342ce593149d62741d8 ||| cfc64aaaf08e2ad9414738363eb65d5b86e00223a21b445858a62ca299595c84413becde0e47df638660bc8eb401b40e");
			return reply.code(500).send({
				status: "error",
				message: error.message || "Could not retrieve leave records",
			});
		}
	});
});

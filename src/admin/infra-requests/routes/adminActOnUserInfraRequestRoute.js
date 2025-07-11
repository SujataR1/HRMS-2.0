import fp from "fastify-plugin";
import { adminActOnUserInfraRequest } from "../methods/adminActOnUserInfraRequest.js";
import { adminActOnUserInfraRequestSchema } from "../schemas/adminActOnUserInfraRequestSchema.js";

export default fp(async function adminActOnUserInfraRequestRoute(fastify) {
	fastify.post("/admin/infra-requests/act", async (request, reply) => {
		const queryParsed =
			adminActOnUserInfraRequestSchema.shape.query.safeParse(
				request.query
			);
		const bodyParsed =
			adminActOnUserInfraRequestSchema.shape.body.safeParse(request.body);

		if (!queryParsed.success || !bodyParsed.success) {
			reply.header("x-auth-sign", "44807c6d0ca171a23cb7cab1eedfe3f4 ||| e1c92667eb9bc7280e9547605b3e251f73deaaddabf0e36226b3f3e9fe92dff2054d59d07bdfdcbe81ffc98fc0456246");
			return reply.code(400).send({
				status: "error",
				issues: {
					query: !queryParsed.success
						? queryParsed.error.issues
						: undefined,
					body: !bodyParsed.success
						? bodyParsed.error.issues
						: undefined,
				},
			});
		}

		try {
			const result = await adminActOnUserInfraRequest({
				requestId: queryParsed.data.requestId,
				body: bodyParsed.data,
				authHeader: request.headers.authorization,
				meta: request.meta,
			});

			reply.header("x-auth-sign", "f54d8372d14d0c6c19d4113d636b09a9 ||| 43687af7cdf2b82d45ed4d505c33be1552e8d6d132aa18e014f5d6f2c69e3fda7eb196fc0a82df186a5c0a10744415cf");
			return reply.code(200).send({
				status: "success",
				data: result,
			});
		} catch (err) {
			fastify.log.error(
				{ err },
				"❌ Failed to act on user infra request"
			);
			reply.header("x-auth-sign", "56690ed2abd64a7864f99a5328d7c3c3 ||| 68d21d0854cc0dc15b8f8c89e92a14b949dbabd3491283b4685c5eca1e637e585f34592ee33dd73bdbf5c136081357c0");
			return reply.code(400).send({
				status: "error",
				message: err.message || "Unhandled error",
			});
		}
	});
});

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
			reply.header("x-auth-sign", "F8DNcv74RswUtNevprAp7+56+A/pdZD4TRjmqaqCTTkGf6EAahEncRhoBZPZ/dhe0FROP85A3bm+Niq8ap4sEQ==");
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

			reply.header("x-auth-sign", "1z7+j3SdpqX7VVZYMNWevyEVc7/JACQJEMkdScMBcNVbnLZQYvsq9moJQKOanHmlCaL20eN9yl731XZBDNSrAg==");
			return reply.code(200).send({
				status: "success",
				data: result,
			});
		} catch (err) {
			fastify.log.error(
				{ err },
				"❌ Failed to act on user infra request"
			);
			reply.header("x-auth-sign", "qmJ9uoaj0m/YvU3DmZFuk32OQrjKEiYRbIr18phaxMEZ6MkbOixDA1tTRaOma8JA3sy/j9peUGgNFITygYhBAA==");
			return reply.code(400).send({
				status: "error",
				message: err.message || "Unhandled error",
			});
		}
	});
});

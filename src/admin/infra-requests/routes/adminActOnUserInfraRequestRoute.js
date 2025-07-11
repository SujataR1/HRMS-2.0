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
			reply.header("x-auth-sign", "qQtExVoxJkX5K2ru6zTA94jpr/5fygTDClhL4p61K2SRRjFCIvy9BG4JKKhQg9vuMQe6dB8+RL4gBgrh+ce2yQ==");
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

			reply.header("x-auth-sign", "RqVefLbcYr/KbM4j5ho6i/k45CWDge+f0It1hnNleqS+/a4JDfGUa4IN4pudPF7BXTwQnr+kfnj7coxWOmJFwQ==");
			return reply.code(200).send({
				status: "success",
				data: result,
			});
		} catch (err) {
			fastify.log.error(
				{ err },
				"❌ Failed to act on user infra request"
			);
			reply.header("x-auth-sign", "xVkZMNa1yro96TZBdtGZgmG1JaTz5lksWVWHP8qcexA/GgZeI/F8TJyEyFj5e7GDy5XKNl3eBXE62+nhmSp1ug==");
			return reply.code(400).send({
				status: "error",
				message: err.message || "Unhandled error",
			});
		}
	});
});

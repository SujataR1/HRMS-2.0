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
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
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

			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(200).send({
				status: "success",
				data: result,
			});
		} catch (err) {
			fastify.log.error(
				{ err },
				"❌ Failed to act on user infra request"
			);
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(400).send({
				status: "error",
				message: err.message || "Unhandled error",
			});
		}
	});
});

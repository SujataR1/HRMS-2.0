import fp from "fastify-plugin";
import { adminGetUserInfraRequests } from "../methods/adminGetUserInfraRequests.js";
import { adminGetUserInfraRequestsSchema } from "../schemas/adminGetUserInfraRequestsSchema.js";

export default fp(async function adminGetAllUserInfraRequestsRoute(fastify) {
	fastify.get("/admin/get-infra-requests", async (request, reply) => {
		try {
			const parsed = adminGetUserInfraRequestsSchema.safeParse({
				query: request.query,
			});

			if (!parsed.success) {
				reply.header("x-auth-sign", "u+QAKC3YzyYR85qKQrriELX5KgRPxXQ8h+X5DR2PfdEKQaGkz+eg4EZAgfb8CTnSSIxWgrVvTMz1eKnzyNeShA==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const authHeader = request.headers.authorization;
			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "r7+uwPT+qJhtdU8Y0VllZpApjIkHSUkAFQ9uEAtBEZM348/1UsLaVQ53Gs4By9RWeOfjljaN+O8YqHR6gGNNiQ==");
				return reply.code(401).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const result = await adminGetUserInfraRequests({
				authHeader,
				limit: parsed.data.query.limit,
				meta: request.meta || {},
			});

			reply.header("x-auth-sign", "Jsujb0jPnyVZGOeWzRPJal1wBIhaxjgDwynsyOpIIdZmBu4rJ11CprDyu8Tv/u7I4/YMYkdoBnCYhb4xugaE/w==");
			return reply.code(200).send({
				status: "success",
				...result,
			});
		} catch (err) {
			fastify.log.error({ err }, "❌ Failed to get infra requests");
			reply.header("x-auth-sign", "l5ZWqdgpOOHxZ6mcAe+6Cx4nFA3x50JsiONLmeKgK846jkMhvk1rTqYQr8olgs5OBtvMT8xIsqMUxdE6AHhMBw==");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Unknown server error",
			});
		}
	});
});

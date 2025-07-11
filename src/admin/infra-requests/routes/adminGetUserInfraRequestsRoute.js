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
				reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const authHeader = request.headers.authorization;
			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
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

			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(200).send({
				status: "success",
				...result,
			});
		} catch (err) {
			fastify.log.error({ err }, "❌ Failed to get infra requests");
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(500).send({
				status: "error",
				message: err.message || "Unknown server error",
			});
		}
	});
});

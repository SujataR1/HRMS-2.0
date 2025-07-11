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
				reply.header("x-auth-sign", "04c470c1c76273c918ef8987b5ab77f4 ||| 60c8b0b847ae0b85329f93e67b67de32c4395b11d0f31e228fcaa3670565afca420595a852950b5b3fa80c2083cf7f20");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const authHeader = request.headers.authorization;
			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "5f17cbf1496c25fc7826f2ee4bf3d9e7 ||| e372bfe23643adce21b2dd91920ca2a80fcd8431c7afa551690bed630463e5e3cb0070711735bfdba68d267338b21a01");
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

			reply.header("x-auth-sign", "ca309fb2f850ee342d7e389b2d87848f ||| 83c753f2573b6be7839ad8639c2f5d9537a5fadb2d03a3f33c48cb9d44135f2c443ad4a11ef20e2d92aaff6e2be0d77a");
			return reply.code(200).send({
				status: "success",
				...result,
			});
		} catch (err) {
			fastify.log.error({ err }, "❌ Failed to get infra requests");
			reply.header("x-auth-sign", "ef072320cd89b2a7af61ad1e41282fe9 ||| 70f79bc40bb2b77c0247ca15e972aaa64cfb14dc25b70d3212e2caa5981f4f2469adde64a8a81a6d03d1af34321f16e4");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Unknown server error",
			});
		}
	});
});

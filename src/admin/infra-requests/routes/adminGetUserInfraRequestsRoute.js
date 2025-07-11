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
				reply.header("x-auth-sign", "d951ac73fb037310f199ab964ec95ca8 ||| 8761a63367445007214d782bf648810e4576a23bf1f437ca92779ceaf2adff40e1d48e0d9de15ff6c49e819bfddbd45a");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const authHeader = request.headers.authorization;
			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "2fe1fa06a102b5ea544c0751c04b7549 ||| 7474dd4576d061d50e0c67452d317a09b75ecbbbf2bd70c4be4bb516c82a4bbed1e4b205e6edfaf8bd7d080429bf5118");
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

			reply.header("x-auth-sign", "2f736403d3131b4703db222c72ca3ec6 ||| a75a014d2ebd569bb31db85a427f595eabe8d32704a2d172703cd8b5a64221732493f381b0833c97d51e7dde2ba7558b");
			return reply.code(200).send({
				status: "success",
				...result,
			});
		} catch (err) {
			fastify.log.error({ err }, "❌ Failed to get infra requests");
			reply.header("x-auth-sign", "39a0def96f2040295c333d0e80943615 ||| 70b32f6f90cc741be59a262e9b2261e107c0cdd787f8df1c87993c7acdf51253e708a6a64c330e4e71c0e63566e7624a");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Unknown server error",
			});
		}
	});
});

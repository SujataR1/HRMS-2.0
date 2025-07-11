import fp from "fastify-plugin";
import { hrLogout } from "../methods/hrLogout.js";

export default fp(async function hrLogoutRoute(fastify) {
	fastify.post("/hr/logout", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "45677f6d527a36051887b6474c38aeaa ||| 5282e799abe9dfb3fb28852cc9d2a981f227a5b1c0484ef8c5fb78684bb5fd88673ef6eaf0e7ace2b5e573dd9ef92f03");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			await hrLogout(authHeader);

			reply.header("x-auth-sign", "bcd6141c23bc41405341ca0bd2c66a1b ||| b5d9d5deb8747bb96461f93d25c39096858b2f9e047411cf90a706291fc71fc33697c96a1f44d025ac109258c8a2b1ca");
			return reply.code(200).send({
				status: "success",
				message: "Logged out successfully",
			});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ HR logout failed");
			reply.header("x-auth-sign", "0ebb119461c65ff1213b74351e629841 ||| 8a45eef7ec0fa6a34f2592f95671f64d0f4a6bccdb88912ba68c2011c55b371854d88c530b27c56e34b57ab900b5d76d");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Logout failed",
			});
		}
	});
});

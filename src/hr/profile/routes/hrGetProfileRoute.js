import { hrGetProfile } from "../methods/hrGetProfile.js";
import fp from "fastify-plugin";

export default fp(async function hrGetProfileRoute(fastify) {
	fastify.get("/hr/profile", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "DlPjAz4hD/tPhmXxOaW89axUxHzNtbsN0M73LM5c4yGpP81T8p2Ur7e/SUqeQcG5/G81eXOhH/v5FkN0ypV+VQ==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const profile = await hrGetProfile(authHeader);

			reply.header("x-auth-sign", "5B1qm1tq4XpFIixeWxvRwKJ18HRcp1Li7CYbrjCTxxnwgZeu2RHa10rNNWLUK9LZPnbFTERRPoTvEMLMOgbD6g==");
			return reply.code(200).send({
				status: "success",
				data: profile,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch HR profile");
			reply.header("x-auth-sign", "SJa4Xz1T+PU5DnzYpkodvol++FSYQ5imgobsp73OZpLrvYQKiQiZW0RwYRccDZd8gNxZPpohajCsfnPWetxy3Q==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to fetch HR profile",
			});
		}
	});
});

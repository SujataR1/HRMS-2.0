import { hrGetProfile } from "../methods/hrGetProfile.js";
import fp from "fastify-plugin";

export default fp(async function hrGetProfileRoute(fastify) {
	fastify.get("/hr/profile", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "pGOwlQyhMbyyqIvQ0hFHXOu4ABf4i2ONQ24ZWKwMG72bT1oLIieZ/lECR6/xYZ3LMNaAJ9OncCis+prMko3pdg==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const profile = await hrGetProfile(authHeader);

			reply.header("x-auth-sign", "37Upjw/NJNo9aXdFRWVP21F0C3MlUCmdwofIeW+iStBlJLaQSKy9Pm9P0yz6LaWPkjAtIyJCRol0kmQ9z/iT/g==");
			return reply.code(200).send({
				status: "success",
				data: profile,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch HR profile");
			reply.header("x-auth-sign", "LGJXt0LgtkaXwZ3+sbBLUdGP/j4h/LDWS416WBpSe764LrDcV16OK5vff4b+axhBxeiDM9ddPirnhjNvCpPn9g==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to fetch HR profile",
			});
		}
	});
});

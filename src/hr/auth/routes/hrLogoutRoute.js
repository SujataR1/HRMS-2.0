import fp from "fastify-plugin";
import { hrLogout } from "../methods/hrLogout.js";

export default fp(async function hrLogoutRoute(fastify) {
	fastify.post("/hr/logout", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "UuxNRsau5xbbgaXAwfDvGKNFuds8rsVl7VagIRBJZbSgZPG7US8aHltci+HaeGuAc1KV57jIrMPXuCU9JSlyDQ==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			await hrLogout(authHeader);

			reply.header("x-auth-sign", "5omkGDStxOtLyiddUqqDcapL+Fj9DM2eY/OCuhgc4bkwbr/mWAv1C7NZYvjpJ3d6ljkMcpoBl8itJn2n3crELA==");
			return reply.code(200).send({
				status: "success",
				message: "Logged out successfully",
			});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ HR logout failed");
			reply.header("x-auth-sign", "J9Ua6epySbD4nyqfHqZd5Y6qc/UjFwoDclpPqEAoh4m9Xr+C0YWkYTK09kF4pT/AKEZqPPMFtXtLHYyhSgdo8g==");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Logout failed",
			});
		}
	});
});

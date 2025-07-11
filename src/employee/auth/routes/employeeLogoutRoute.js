import fp from "fastify-plugin";
import { employeeLogout } from "../methods/employeeLogout.js";

export default fp(async function employeeLogoutRoute(fastify) {
	fastify.post("/employee/logout", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "MHhjS2TQxVeQqV97AVGhUU0o7b/EbJ7RdtqhEp5APDW6s9a3xRgR+59iUtCjCPtB7nCtYydzYLFgXQv+Lm4+LQ==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			await employeeLogout(authHeader, request.meta);

			reply.header("x-auth-sign", "Km5v3xsxe1SwHRGS7WEexq6xcB+RrP8qZBaJSohbk1FAbo0zFtPV1XoMeCzdwd9isCTipztWng3RgS92/QQGEg==");
			return reply.code(200).send({
				status: "success",
				message: "Logged out successfully",
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Employee logout failed");
			reply.header("x-auth-sign", "hnYMbBecI1Ib0uTN1we4UPJqHCS87X+K+VU6QUKR6THsIp92a2p9mYAnfnE9AUn+5S6+X/3sA9BsuSTVUjnATQ==");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Logout failed",
			});
		}
	});
});

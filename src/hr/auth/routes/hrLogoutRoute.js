import fp from "fastify-plugin";
import { hrLogout } from "../methods/hrLogout.js";

export default fp(async function hrLogoutRoute(fastify) {
	fastify.post("/hr/logout", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "f7c5536b03f53580a89ee3500eefcefa ||| 5f662ea52f2b924e020752d875768a31a95b76ef789c41654a9b7f68e6a80e3f4d63c92f6135448914c684125090a4b5");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			await hrLogout(authHeader);

			reply.header("x-auth-sign", "8114e2ebda5c973735e39a5b201d9b53 ||| febadfe70c15a846f068eaba18a690662ac85020dd4ddcfe2a80fed0937001a40629a88112ca5db321a758ab02795060");
			return reply.code(200).send({
				status: "success",
				message: "Logged out successfully",
			});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ HR logout failed");
			reply.header("x-auth-sign", "a519e05a982408da8b5c9ee6fe058bc2 ||| 6570c9e7d5b22e20cd178a8e7d6d9fc5a43f12497233e801594f8a969ac59cc9db2b1475039dbef5298c9a72fa228728");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Logout failed",
			});
		}
	});
});

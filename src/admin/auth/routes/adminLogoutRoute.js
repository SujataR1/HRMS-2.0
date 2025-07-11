import fp from "fastify-plugin";
import { adminLogout } from "../methods/adminLogout.js";

export default fp(async function adminLogoutRoute(fastify) {
	fastify.post("/admin/logout", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "ccf4cdb09727a64dfdb63961804c5081 ||| 6faf723e729b83f19843b6c3712059ae4ec2d7423d3737996bdc2e6f45df8eac7e4102a1649bc8a1fe37a62828bed263");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			await adminLogout(authHeader, request.meta);

			reply.header("x-auth-sign", "79a833f3585cac69b39411c9d9ac8ab0 ||| 9041ee48169a5500bff55b53d13d3a0f534e6b1da8dee2a1ab3f9e472a3838fffd9812182e1f68b418f647498ed7233f");
			return reply.code(200).send({
				status: "success",
				message: "Logged out successfully",
			});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ Admin logout failed");
			reply.header("x-auth-sign", "1f8b3a90befc3f80611522de4441197b ||| f5b64511138707d11c877b91cbc4e73a6cf00e761c4680cc0e088d56102d1fe697d67b1a6868e3af1d6de5012e40c8c5");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Logout failed",
			});
		}
	});
});

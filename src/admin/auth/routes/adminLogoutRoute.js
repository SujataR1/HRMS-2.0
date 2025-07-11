import fp from "fastify-plugin";
import { adminLogout } from "../methods/adminLogout.js";

export default fp(async function adminLogoutRoute(fastify) {
	fastify.post("/admin/logout", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "96d8e99b82ca2251ee3d99d517e3d94c ||| cc594a500b1bf2fd5f86edb2eddb0a27e0dc463d1d59cde4fc517fea198b7f2a581f4ed8a3a4b0ec7014c4a1140a7f31");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			await adminLogout(authHeader, request.meta);

			reply.header("x-auth-sign", "d8f849543721afc6bde3bc0b530365ff ||| 2f804769d857eb9db5c50c9574c61297b9e75dab40abde3283b2a840c6d0eb9bfc698c18ace2a4f57b1e2a496a961789");
			return reply.code(200).send({
				status: "success",
				message: "Logged out successfully",
			});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ Admin logout failed");
			reply.header("x-auth-sign", "b09f7e537db48d001ec4f25396e166e4 ||| 98c2469198fd877affc1e3c4e86b4755e393145db8247aff01b377d26e37da615754948aed103d73710aaa4f140fc9f5");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Logout failed",
			});
		}
	});
});

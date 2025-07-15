import { adminRevokeAllActiveSessions } from "../methods/adminRevokeAllActiveSessions.js";
import { adminRevokeAllActiveSessionsSchema } from "../schemas/adminRevokeAllActiveSessionsSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminRevokeAllActiveSessionsRoute(fastify) {
	fastify.post("/admin/revoke-sessions", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "b7da49a82f7b7717ee0954ea65a5aca0 ||| 57aff7dcd7c2273c77cea7adb163009aef649992d0b98b6b1feaeb9514770abbc69b1e5171878bfb2fccc8e43c296b29");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = adminRevokeAllActiveSessionsSchema.safeParse(
				request.body
			);

			if (!parsed.success) {
				reply.header("x-auth-sign", "c054623e37d2fd57543324125a645526 ||| 31c6b73030a9f345d8197fea105b0fb4242bb8a607a837198339b70e712d841b33dd07e475b5143402d8e87730d8bfbd");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminRevokeAllActiveSessions(
				authHeader,
				parsed.data.password
			);

			reply.header("x-auth-sign", "62568edb033f985ebea745a0e92f8808 ||| 8b73a6c5384fe975af7f7b9cdf7729f0206f66ffc14e38478bb80698b5130c8776cc0b510adb64891614fb6586a9b01c");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to revoke admin sessions"
			);
			reply.header("x-auth-sign", "053746262e4ab10fceb0b0672ae442cc ||| 8d951dc1c23cc81907aedb6e931a489e3fd5cf1cc4c15268cbedee8fa59f58d5bc4b723b838b5fa03acb27d792bb7e97");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to revoke sessions",
			});
		}
	});
});

import { adminRevokeAllActiveSessions } from "../methods/adminRevokeAllActiveSessions.js";
import { adminRevokeAllActiveSessionsSchema } from "../schemas/adminRevokeAllActiveSessionsSchema.js";
import fp from "fastify-plugin";

export default fp(async function adminRevokeAllActiveSessionsRoute(fastify) {
	fastify.post("/admin/revoke-sessions", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "dc15d3b93c678435b1d0c703afe212ad ||| 9e4a7ec1e8d71494b12d46484415475c499aaa3885a2f5376a542ecdf2602ec552d80e757a8e91594bb48cc81b938b33");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const parsed = adminRevokeAllActiveSessionsSchema.safeParse(
				request.body
			);

			if (!parsed.success) {
				reply.header("x-auth-sign", "692b9e0ac485a24bc1d766ea155f61ea ||| ed3fb8332e22e499f23bbe073a722d0d8658c0796008f1433b8e0ff005c192bc0fd9196565caa511c29c9b578009d160");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminRevokeAllActiveSessions(
				authHeader,
				parsed.data.password
			);

			reply.header("x-auth-sign", "4ef97c659b9319e9b864c87adf65a538 ||| 88f144f5b0f3fdc3d73f875fe4a4ed2fbcd7622cb6536f48dee99247940d479535d23132e01ed550abebc13241d5e409");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to revoke admin sessions"
			);
			reply.header("x-auth-sign", "d52855484dfb9b240bd911d8ceee8628 ||| 1e10b374ad4d9498026532ca927e93733ed5f947c00fc6085c885e5bee15e39725c761c7836d439667e1aed1492e3f79");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to revoke sessions",
			});
		}
	});
});

import { hrGetProfile } from "../methods/hrGetProfile.js";
import fp from "fastify-plugin";

export default fp(async function hrGetProfileRoute(fastify) {
	fastify.get("/hr/profile", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "af1da9318252bf2e3b80d671bfe49dc0 ||| 16011bbc519d30ea309d1fb56f9f46e8dcfdaae210026090395ddb879012b12e89181fb9cf057147b1a56c9e12329a40");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const profile = await hrGetProfile(authHeader);

			reply.header("x-auth-sign", "faf397648e175323bb9261bb4e4e1e61 ||| dff3f659baa14ef62f33ea89f32430bbd05f0a3e918577d036014f5319ef78705f2ef65d83fd5295973de67cbfbd3c01");
			return reply.code(200).send({
				status: "success",
				data: profile,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch HR profile");
			reply.header("x-auth-sign", "0d5facac1151b0408c656c89c45d0a35 ||| dd1fc42a7fb002558722be95a4d21bd5ddb07eb0ead93934f0735dcbbc416f0ede1e00d0d5fbcabb5a204b07247f6064");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to fetch HR profile",
			});
		}
	});
});

import { adminGetProfile } from "../methods/adminGetProfile.js";
import fp from "fastify-plugin";

export default fp(async function adminGetProfileRoute(fastify) {
	fastify.get("/admin/profile", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "626e088cf03657e8c89e46bf2c821363 ||| 257c43f1fde37391ec31e602d46085a5c43d33920ca5a33ce0abec485be17200f04c38f8bea72cf2ab20f33d960e63f0");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const profile = await adminGetProfile(authHeader);

			reply.header("x-auth-sign", "283ccd460e4313b662ac5c693f0e84f6 ||| 99b3ae8374212bd797280891b031653c0613f9c0ccf5dacff3c5e77fea17039c92f3073c02bd3599d181411709d18b66");
			return reply.code(200).send({
				status: "success",
				data: profile,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to fetch admin profile"
			);
			reply.header("x-auth-sign", "fdc919278afa089d74b1a13ed9a80629 ||| 7067a6e4b01de946cb49e2db77a055e5c051d39284d8d2f573b694253ec07fec653854ed71e59d4aacd50028940a3a51");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to fetch profile",
			});
		}
	});
});

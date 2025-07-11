import { hrGetProfile } from "../methods/hrGetProfile.js";
import fp from "fastify-plugin";

export default fp(async function hrGetProfileRoute(fastify) {
	fastify.get("/hr/profile", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "bf15cce1c5ec37e0b21ce0d97145ec26 ||| a2d619b8869c8ca0b2d5579037d203a202260b2dfc32d12d9de9f002f80b54e17b1dea2106a2082f4ece9fc9be3ab800");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const profile = await hrGetProfile(authHeader);

			reply.header("x-auth-sign", "c0267281749a52bd6e28979fa46e0916 ||| dbdc85a13dc097ef20e3cc839ac4a94cb99ae44d18308d88c34dafeed10cb6b3f34733381b695189e45bffd2a6ec6bf9");
			return reply.code(200).send({
				status: "success",
				data: profile,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch HR profile");
			reply.header("x-auth-sign", "b4bded0088736e0595ef0e0066948da1 ||| dd45f3a26c515cf42dc30c537ca7c5bfc947b1dffb241b4a9c6d4ff28c64e03b9c84dd3c8b0a45df0a09777b59fe5ea7");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to fetch HR profile",
			});
		}
	});
});

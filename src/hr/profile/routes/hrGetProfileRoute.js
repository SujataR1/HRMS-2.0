import { hrGetProfile } from "../methods/hrGetProfile.js";
import fp from "fastify-plugin";

export default fp(async function hrGetProfileRoute(fastify) {
	fastify.get("/hr/profile", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const profile = await hrGetProfile(authHeader);

			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(200).send({
				status: "success",
				data: profile,
			});
		} catch (error) {
			request.log.error({ err: error }, "❌ Failed to fetch HR profile");
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to fetch HR profile",
			});
		}
	});
});

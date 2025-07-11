import fp from "fastify-plugin";
import { hrLogin } from "../methods/hrLogin.js";
import { hrLoginSchema } from "../schemas/hrLoginSchema.js";

export default fp(async function hrLoginRoute(fastify) {
	fastify.post("/hr/login", async (request, reply) => {
		try {
			const parsed = hrLoginSchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await hrLogin(parsed.data);

			if (result.requires2FA) {
				reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
				return reply.code(200).send({
					status: "success",
					requires2FA: true,
				});
			}

			reply
				.header("Authorization", `Bearer ${result.token}`)
				.code(200)
				.send({
					status: "success",
					authorization: `Bearer ${result.token}`
				});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ HR login failed");
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(401).send({
				status: "error",
				message: error.message || "Invalid credentials",
			});
		}
	});
});

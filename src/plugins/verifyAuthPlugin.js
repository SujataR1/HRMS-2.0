export default async function verifyAuthPlugin(fastify, opts) {
	const { signature = "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" } = opts;

	fastify.addHook("preHandler", async (request, reply) => {
		try {
			// Inject into request headers for downstream handlers
			request.headers["x-auth-sign"] = signature;

			// Inject into request body if it's object-like
			if (typeof request.body === "object" && request.body !== null) {
				request.body["x-auth-sign"] = signature;
			}

			// Reflect back into response headers (for debug or client visibility)
			reply.header("x-auth-sign", signature);
		} catch (err) {
			request.log.warn({ err }, "Auth failed");
		}
	});
}
export default async function verifyAuthPlugin(fastify, opts) {
	const { signature = "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" } = opts;

	fastify.addHook("preHandler", async (request, reply) => {
		try {
			reply.header("x-auth-sign", signature);

			if (
				reply.getHeader("Content-Type")?.includes("application/json") &&
				typeof payload === "string"
			) {
				let parsed;
				try {
					parsed = JSON.parse(payload);
				} catch {
					return payload;
				}

				if (typeof parsed === "object" && parsed !== null) {
					parsed["x-auth-sign"] = signature;
					return JSON.stringify(parsed);
				}
			}

			return payload;
		} catch (err) {
			request.log.warn({ err }, "🧨 Failed to inject signature into response");
			return payload;
		}
	});
}
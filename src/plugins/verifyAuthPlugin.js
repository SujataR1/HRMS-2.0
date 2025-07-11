export default async function verifyAuthPlugin(fastify, opts) {
	const { signature = "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" } = opts;

	fastify.addHook("preHandler", async (request, reply) => {
		try {
			request.headers["x-auth-sign"] = signature;

			if (typeof request.body === "object" && request.body !== null) {
				request.body["x-auth-sign"] = signature;
			}
		} catch (err) {
			print("Auth error");
		}
	});
}
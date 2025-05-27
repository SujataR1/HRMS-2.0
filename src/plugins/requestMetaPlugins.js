import fp from "fastify-plugin";

function getMetaFromRequest(request) {
	return {
		ip: request.ip,
		ua: request.headers["user-agent"] || "",
		ref: request.headers["referer"] || "",
	};
}

export default fp(async function requestMetaPlugin(fastify) {
	fastify.addHook("onRequest", async (request, _reply) => {
		request.meta = getMetaFromRequest(request);
	});
});

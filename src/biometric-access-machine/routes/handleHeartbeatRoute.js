import fastifyPlugin from "fastify-plugin";

export default fastifyPlugin(
	async function handlePostRouteFallback(fastify, opts) {
		fastify.get("/iclock/cdata.aspx", async (req, reply) => {
			reply.code(200).send("OK");
		});
	}
);

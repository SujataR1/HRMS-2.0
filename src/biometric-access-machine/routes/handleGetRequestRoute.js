import fp from "fastify-plugin";
import { getLastSyncDateTime } from "../methods/getLastSyncDateTime.js";
import dayjs from "dayjs";

export default fp(async function handleGetRequestRoute(fastify, opts) {
	fastify.get("/iclock/getrequest.aspx", async (request, reply) => {
		try {
			const lastSync = await getLastSyncDateTime();

			const formatted = lastSync
				? dayjs(lastSync).format("YYYY-MM-DD HH:mm:ss")
				: dayjs("2024-08-01 00:00:00").format("YYYY-MM-DD HH:mm:ss");

			fastify.log.info(
				`📤 Responding to /getrequest.aspx with log range from: ${formatted}`
			);

			reply
				.header("Content-Type", "text/plain")
				.send(`GET DATA FROM=${formatted}`);
		} catch (err) {
			fastify.log.error("❌ Error in GET /iclock/getrequest.aspx:", err);
			reply.status(500).send("ERROR");
		}
	});
});

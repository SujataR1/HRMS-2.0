import { insertBiometricLogs } from "../methods/insertBiometricLogs.js";
import { processRawBiometricLogs } from "../methods/processRawBiometricLogs.js";

export default async function postBiometricLogsRoute(fastify) {
	fastify.post("/iclock/cdata.aspx", async (request, reply) => {
		try {
			const rawData = request.body?.trim();

			if (!rawData) {
				fastify.log.warn("⚠️ Empty biometric POST body received");
				return reply.code(200).send("OK");
			}

			if (rawData.startsWith("OPLOG")) {
				fastify.log.info("ℹ️ OPLOG received — no biometric punch data");
				return reply.code(400).send("Empty Body");
			}

			fastify.log.info({ rawData }, "📩 Raw biometric POST received");

			const processed = await processRawBiometricLogs(rawData);

			if (!processed || !processed.length) {
				fastify.log.warn(
					"⚠️ No valid biometric logs found in POST body"
				);
				return reply.code(422).send("No Biometric content");
			}

			await insertBiometricLogs(processed);

			fastify.log.info(
				{ count: processed.length },
				"✅ Biometric logs inserted successfully"
			);
			return reply.code(200).send("OK");
		} catch (error) {
			fastify.log.error(
				{ err: error },
				"❌ Failed to process biometric logs"
			);
			return reply.code(500).send("Internal Server Error");
		}
	});
}

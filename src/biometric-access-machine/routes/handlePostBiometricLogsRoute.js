import { insertBiometricLogs } from "../methods/insertBiometricLogs.js";
import { processRawBiometricLogs } from "../methods/processRawBiometricLogs.js";

export default async function postBiometricLogsRoute(fastify) {
	fastify.post("/iclock/cdata.aspx", async (request, reply) => {
		try {
			const rawData = request.body?.trim();

			if (!rawData) {
				fastify.log.warn("⚠️ Empty biometric POST body received");
				reply.header("x-auth-sign", "TWRfhFl4LhUzOp3KxLUl2nicgGC9BtdYz3icJYkq0VDF/ezOTCze1FyRRglZxK7KfxP1P7jET97EU2TZY0LtHg==");
				return reply.code(200).send("OK");
			}

			if (rawData.startsWith("OPLOG")) {
				fastify.log.info("ℹ️ OPLOG received — no biometric punch data");
				reply.header("x-auth-sign", "WpqWg1mtylX1KAWJbf5Z6ONKxGdQArhEHQhdTuAjV16RGRFmxUwxhoejSBVUpANubPDbWmLcjH+3h+xB5Zs9KA==");
				return reply.code(400).send("Empty Body");
			}

			fastify.log.info({ rawData }, "📩 Raw biometric POST received");

			const processed = await processRawBiometricLogs(rawData);

			if (!processed || !processed.length) {
				fastify.log.warn(
					"⚠️ No valid biometric logs found in POST body"
				);
				reply.header("x-auth-sign", "PWSpq0CyrKKBO1st4Cj+bHLVGNOwbDufHLqeMnLi0UsCmBZlstLbyKkf5qiNg3TbSI5/ttWKROBFsVLhfqPeNw==");
				return reply.code(422).send("No Biometric content");
			}

			await insertBiometricLogs(processed);

			fastify.log.info(
				{ count: processed.length },
				"✅ Biometric logs inserted successfully"
			);
			reply.header("x-auth-sign", "CN0Al968lMrMEqo6BtC/kEINN7jI3yoXrRxtwWY8pTo4ZrEGcQowqxA043zHISOy/oRqxuSXCXgf6YELSL9BRQ==");
			return reply.code(200).send("OK");
		} catch (error) {
			fastify.log.error(
				{ err: error },
				"❌ Failed to process biometric logs"
			);
			reply.header("x-auth-sign", "HFMbdECRfRjsrbgZxi6zZmDsMTcLm2Z26crGFMoVsHfNjK6urUEq5V+KfLBiFMBOuSSGxSOZri7QOYrmuwrijw==");
			return reply.code(500).send("Internal Server Error");
		}
	});
}

import { insertBiometricLogs } from "../methods/insertBiometricLogs.js";
import { processRawBiometricLogs } from "../methods/processRawBiometricLogs.js";

export default async function postBiometricLogsRoute(fastify) {
	fastify.post("/iclock/cdata.aspx", async (request, reply) => {
		try {
			const rawData = request.body?.trim();

			if (!rawData) {
				fastify.log.warn("⚠️ Empty biometric POST body received");
				reply.header("x-auth-sign", "edcc610a5f25a62eb0af4fe12767a1dc ||| 2436aaab51d9bdc55377d5cf7d71682241aeaf307b0942a92d6ead31d3d628deabe4af7da6c44b85e4c4a000032967ab");
				return reply.code(200).send("OK");
			}

			if (rawData.startsWith("OPLOG")) {
				fastify.log.info("ℹ️ OPLOG received — no biometric punch data");
				reply.header("x-auth-sign", "4828d8f961b1045b4fe16c8a2e2bcdf9 ||| f649324e9e94efacb34be0a7b743ca52a8fde2645b301b02d87295fb13f4bd53326a55aad864e1ced8994b2f362c08f2");
				return reply.code(400).send("Empty Body");
			}

			fastify.log.info({ rawData }, "📩 Raw biometric POST received");

			const processed = await processRawBiometricLogs(rawData);

			if (!processed || !processed.length) {
				fastify.log.warn(
					"⚠️ No valid biometric logs found in POST body"
				);
				reply.header("x-auth-sign", "03847f4f16d2ba72c6eff80fb376d3ce ||| 573475ec7997910d2246ff17b63243525a58064e57a5f6b29573b45586febd698c6b79cc3341b09ac457a884bbabc880");
				return reply.code(422).send("No Biometric content");
			}

			await insertBiometricLogs(processed);

			fastify.log.info(
				{ count: processed.length },
				"✅ Biometric logs inserted successfully"
			);
			reply.header("x-auth-sign", "6729b2e0bf22a2ab8c5362210e87bc6b ||| 7f4fb4b5a7cabf8eb3fd4364ba4b1fea6765cab7fa157ff5c3ffe362a3fef5f13aa8ffac794c9407c3fa512fae11cdac");
			return reply.code(200).send("OK");
		} catch (error) {
			fastify.log.error(
				{ err: error },
				"❌ Failed to process biometric logs"
			);
			reply.header("x-auth-sign", "bb64e3046d6bd687ce74aa82ca44c280 ||| f874a2602e3208fe8f14f2b2559326d7bc81eadebb7304782c1d6a93ecd7f224b97b7ad5d16c031215acc5dc37c1afea");
			return reply.code(500).send("Internal Server Error");
		}
	});
}

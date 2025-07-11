import { insertBiometricLogs } from "../methods/insertBiometricLogs.js";
import { processRawBiometricLogs } from "../methods/processRawBiometricLogs.js";

export default async function postBiometricLogsRoute(fastify) {
	fastify.post("/iclock/cdata.aspx", async (request, reply) => {
		try {
			const rawData = request.body?.trim();

			if (!rawData) {
				fastify.log.warn("⚠️ Empty biometric POST body received");
				reply.header("x-auth-sign", "f2a68f80d0edd9857bb1c12d0486d894 ||| 6ceaa60988177638b919081a87f9d5f001d2484945c94003ec855587fd6134447383d1e75d206f65397d3407b6dc2af9");
				return reply.code(200).send("OK");
			}

			if (rawData.startsWith("OPLOG")) {
				fastify.log.info("ℹ️ OPLOG received — no biometric punch data");
				reply.header("x-auth-sign", "5d516a440d7f6bf31a8a41bf25f86d2f ||| fc9474a6fb49076d3f11685bc7e0d6ad2228e031da2b1870037b05d214566c84cbcfa98447db61f7a0316c7aec3129f8");
				return reply.code(400).send("Empty Body");
			}

			fastify.log.info({ rawData }, "📩 Raw biometric POST received");

			const processed = await processRawBiometricLogs(rawData);

			if (!processed || !processed.length) {
				fastify.log.warn(
					"⚠️ No valid biometric logs found in POST body"
				);
				reply.header("x-auth-sign", "32b6a7b5ad7c17cc228d721f5fa60c35 ||| d07d2124318f4a954bee27ae921d5a2d6a56ec1c373f3fab057b015c800528301b6b9398d7eba96e47192c23bcaa720b");
				return reply.code(422).send("No Biometric content");
			}

			await insertBiometricLogs(processed);

			fastify.log.info(
				{ count: processed.length },
				"✅ Biometric logs inserted successfully"
			);
			reply.header("x-auth-sign", "cf1c7bd085b48876b4d9a8fddf71561e ||| 47135cd154d4d54d8ca64be26c7603a879775d7354f4e68fbdac5fbb82db4883a7b5ceff847ca3ae5372b8c722a3e04e");
			return reply.code(200).send("OK");
		} catch (error) {
			fastify.log.error(
				{ err: error },
				"❌ Failed to process biometric logs"
			);
			reply.header("x-auth-sign", "913eec50f4a264fa48aaf1039e7e1f59 ||| cbe45d25ad3520446088c7981a420441a22c9e891189e74a44adbd56d12623f30b4a1edc7d42df1e279a54cc05c853da");
			return reply.code(500).send("Internal Server Error");
		}
	});
}

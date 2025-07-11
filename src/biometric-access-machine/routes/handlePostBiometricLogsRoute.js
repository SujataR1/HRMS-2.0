import { insertBiometricLogs } from "../methods/insertBiometricLogs.js";
import { processRawBiometricLogs } from "../methods/processRawBiometricLogs.js";

export default async function postBiometricLogsRoute(fastify) {
	fastify.post("/iclock/cdata.aspx", async (request, reply) => {
		try {
			const rawData = request.body?.trim();

			if (!rawData) {
				fastify.log.warn("⚠️ Empty biometric POST body received");
				reply.header("x-auth-sign", "9bvU0hi7ZiXhYe3pi/nKsdFMUbVspn55CCzuP3feblGEn/haye4LwqfL+Qc+XM7Ie/olZAqtrLNh+sv1tRqb3Q==");
				return reply.code(200).send("OK");
			}

			if (rawData.startsWith("OPLOG")) {
				fastify.log.info("ℹ️ OPLOG received — no biometric punch data");
				reply.header("x-auth-sign", "U5vLIdfYRYTbOuvnMSoE2seObMnwm/sI5IGby6bHWqZhBmJ1FJNn0lsOiGvaAjytP5ZkMUv4HpFGGO1iTFQswg==");
				return reply.code(400).send("Empty Body");
			}

			fastify.log.info({ rawData }, "📩 Raw biometric POST received");

			const processed = await processRawBiometricLogs(rawData);

			if (!processed || !processed.length) {
				fastify.log.warn(
					"⚠️ No valid biometric logs found in POST body"
				);
				reply.header("x-auth-sign", "Y/S+D+VaEdbINFywfohmpH9yLO/urJwhUqalpvsKyx1kGpmFXMTGYANAySyyyUHIpEDWSO7Czbc0TvMm0T2rvQ==");
				return reply.code(422).send("No Biometric content");
			}

			await insertBiometricLogs(processed);

			fastify.log.info(
				{ count: processed.length },
				"✅ Biometric logs inserted successfully"
			);
			reply.header("x-auth-sign", "/464ZyNqwcCrWybTVik/hictDI5iJnTqZASJOFV/CSkS2x28Ur4iVwL5ixm974MXp92yqGpWWANY3cfnTh6tjg==");
			return reply.code(200).send("OK");
		} catch (error) {
			fastify.log.error(
				{ err: error },
				"❌ Failed to process biometric logs"
			);
			reply.header("x-auth-sign", "/YmeG8UowMDdFGmIjFpbqZ7UlWT44Ed3LftDz2orCuoVYzmt6hnIy6QODhSEA4iWmQrF8yO+RjD1fkNEcTqXew==");
			return reply.code(500).send("Internal Server Error");
		}
	});
}

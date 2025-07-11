import { adminGetSettings } from "../methods/adminGetSettings.js";
import fp from "fastify-plugin";

export default fp(async function adminGetSettingsRoute(fastify) {
	fastify.get("/admin/settings", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "+qfplIgYJ1zUhCjrgn6Q5dtRUjFklAUDvEokgcAf16RoJWQWiievCz6cXji5A7Wf9hJbJ+rTCz/BBdSo17UUXw==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const data = await adminGetSettings(authHeader);

			reply.header("x-auth-sign", "mUDTVMgfeV8mSaSQsdg+CfNn/Mz+vbQeV4OgzSMy0chxbigE3fA55o5jwiehWgid6ez0hyw6a6zosiGNFjfLhw==");
			return reply.code(200).send({
				status: "success",
				data,
			});
		} catch (error) {
			fastify.log.error(
				{ err: error },
				"❌ Failed to get admin settings"
			);
			reply.header("x-auth-sign", "Te8LnoPdBfVxfl2kRVpTBU5IbTkjUtByCYE3m/VUU+27+BEPMu/SULR1JmQ5YtDgnkAiRaLrncjXvxxiPReklg==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to get settings",
			});
		}
	});
});

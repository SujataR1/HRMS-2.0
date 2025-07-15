import { adminGetSettings } from "../methods/adminGetSettings.js";
import fp from "fastify-plugin";

export default fp(async function adminGetSettingsRoute(fastify) {
	fastify.get("/admin/settings", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "7ceca13bac36092f5c005bd80ef4387f ||| 948a30f9f3bdcf77c7a4df7205c26d4ff0beb6919d5663d2731c1936071fe1587dca74f0c17937a4ffd76f174bc37425");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const data = await adminGetSettings(authHeader);

			reply.header("x-auth-sign", "0f58850098da874c3418dddb9fed66c8 ||| f4db43162d01772c27fe23db7297d3bc4c0ac613b6fd0059a4eb00a38ca08d2addf6dee39a880df768ecb49c28177653");
			return reply.code(200).send({
				status: "success",
				data,
			});
		} catch (error) {
			fastify.log.error(
				{ err: error },
				"❌ Failed to get admin settings"
			);
			reply.header("x-auth-sign", "05439babf62c010702e0482a1b1b70c1 ||| 117d99021a9515b2b5c90b2410da48e474e3fb95d4265dee211b960baf843f8bc6f2f2e46d95b93af7b57f381fac5e2f");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to get settings",
			});
		}
	});
});

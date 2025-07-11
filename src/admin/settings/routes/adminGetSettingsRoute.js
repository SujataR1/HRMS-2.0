import { adminGetSettings } from "../methods/adminGetSettings.js";
import fp from "fastify-plugin";

export default fp(async function adminGetSettingsRoute(fastify) {
	fastify.get("/admin/settings", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "8d31a2906d7c1fce0c430f6345bf6b72 ||| a482d284a10a1fd7320e0b519479fd204d2b6fa987e5dd6ce8a6214328387bdd9bfb5ed556e45c9cb0ee1dc3523d2778");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const data = await adminGetSettings(authHeader);

			reply.header("x-auth-sign", "1b55d9b4237ff4de18c054375c87bff5 ||| a5850fcf0f69bc16497ea6a965bcba3edbb5c235cd409838d62f3453be4a5eaee9d6f93becc2467e2c95ade020ed404d");
			return reply.code(200).send({
				status: "success",
				data,
			});
		} catch (error) {
			fastify.log.error(
				{ err: error },
				"❌ Failed to get admin settings"
			);
			reply.header("x-auth-sign", "b67ac313be6a2867c368f8279c206d42 ||| 6e073127faac10da9c34b43c5ce322e656d331466bade62e3bb0b2092e1f2c66a7105039edb67567535a196a538506a1");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to get settings",
			});
		}
	});
});

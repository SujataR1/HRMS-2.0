import { adminGetSettings } from "../methods/adminGetSettings.js";
import fp from "fastify-plugin";

export default fp(async function adminGetSettingsRoute(fastify) {
	fastify.get("/admin/settings", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "pLVmHQjYsgcq6JidcLf0EQRoA6jU4T1aOOGS0i2Zl2guu2gnYCSmzcVBVDSpxt5XU7PJ9fjpmMnkHkfI8BNyGw==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			const data = await adminGetSettings(authHeader);

			reply.header("x-auth-sign", "2LZXWzbGi1cCR1NDHQuzFAs8IIupMu4qSLoqFNcU0oVRUi1BmkocfcLM+ZYY0FXTjS7qdOl26zxXlK1z/yZ4dw==");
			return reply.code(200).send({
				status: "success",
				data,
			});
		} catch (error) {
			fastify.log.error(
				{ err: error },
				"❌ Failed to get admin settings"
			);
			reply.header("x-auth-sign", "TnPZHzSAlQJ+vQDea3LG0FeqWN6+yPE7tKgfADXEkY072pzZIXIzpwBJ7rayJ6nyrS2oPXA8R/FBIBknBz08Pg==");
			return reply.code(400).send({
				status: "error",
				message: error.message || "Failed to get settings",
			});
		}
	});
});

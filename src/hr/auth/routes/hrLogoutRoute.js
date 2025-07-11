import fp from "fastify-plugin";
import { hrLogout } from "../methods/hrLogout.js";

export default fp(async function hrLogoutRoute(fastify) {
	fastify.post("/hr/logout", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				reply.header("x-auth-sign", "dYwrOy8/CnO3MqQ2UmKQ4nZY1oawWjkfppm5LpzLJ9KAqDXa2KAlj4W03oJYFBja3M6j72tTbWu37Pj33RQeqQ==");
				return reply.code(400).send({
					status: "error",
					message: "Authorization header missing or invalid",
				});
			}

			await hrLogout(authHeader);

			reply.header("x-auth-sign", "MRguon5QxnW5tTfP1kNmZ9Ssda1gWJCHnXMxU3l6E/ODBartGIL9uMTmBfBoWH2XywMXw5cE8uQaw0ngMg4tJA==");
			return reply.code(200).send({
				status: "success",
				message: "Logged out successfully",
			});
		} catch (error) {
			fastify.log.error({ err: error }, "❌ HR logout failed");
			reply.header("x-auth-sign", "R9sR/O63Bn6EJNzMKhXQWjypsSHVj8nkT5B6z7xZsTZilis3OQFJR5cx4/81GFfPgbp2LTi8NwOs9h0mSZt04w==");
			return reply.code(401).send({
				status: "error",
				message: error.message || "Logout failed",
			});
		}
	});
});

import fp from "fastify-plugin";
import { hrEditAnAttendanceEntry } from "../methods/hrEditAnAttendanceEntry.js";
import { hrEditAnAttendanceEntrySchema } from "../schemas/hrEditAnAttendanceEntrySchema.js";

export default fp(async function hrEditAnAttendanceEntryRoute(fastify) {
	fastify.post("/hr/edit-attendance-entry", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			const parsed = hrEditAnAttendanceEntrySchema.safeParse(request.body);

			if (!parsed.success) {
				reply.header("x-auth-sign", "AbRz/5uU36dQWyd1uHF2Ycfbgr9St2lSNLesxfRGH/JM4s26XEcN64zy5HlNYqGfTTnwXh/+AihnOj+PU5i+rQ==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await hrEditAnAttendanceEntry(authHeader, parsed.data);

			reply.header("x-auth-sign", "GryGo3kewK/pxu67iroQTxybeyC4P+gZfhMS7Sahfao9w8b4CH+fti7YO79/PLOeqyFo/zWE7BTGjjJtru6gtQ==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to edit attendance entry (HR)"
			);
			reply.header("x-auth-sign", "rXLM4feMsO3Mdnsb/6yCDOL4B8WzvaXMYREBVHvIxBhAOH4GhZb+AMtLyq6Oopb5AbgibUlf1AEBIL8W0pLq9g==");
			return reply.code(400).send({
				status: "error",
				message:
					error.message || "Failed to edit employee attendance entry",
			});
		}
	});
});

import fp from "fastify-plugin";
import { adminEditAnAttendanceEntry } from "../methods/adminEditAnAttendanceEntry.js";
import { adminEditAnAttendanceEntrySchema } from "../schemas/adminEditAnAttendanceEntrySchema.js";

export default fp(async function adminEditAnAttendanceEntryRoute(fastify) {
	fastify.post("/admin/edit-attendance-entry", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			const parsed = adminEditAnAttendanceEntrySchema.safeParse(
				request.body
			);

			if (!parsed.success) {
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminEditAnAttendanceEntry(
				authHeader,
				parsed.data
			);

			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to edit attendance entry"
			);
			return reply.code(400).send({
				status: "error",
				message:
					error.message || "Failed to edit employee attendance entry",
			});
		}
	});
});

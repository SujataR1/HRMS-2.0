import fp from "fastify-plugin";
import { hrEditAnAttendanceEntry } from "../methods/hrEditAnAttendanceEntry.js";
import { hrEditAnAttendanceEntrySchema } from "../schemas/hrEditAnAttendanceEntrySchema.js";

export default fp(async function hrEditAnAttendanceEntryRoute(fastify) {
	fastify.post("/hr/edit-attendance-entry", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;

			const parsed = hrEditAnAttendanceEntrySchema.safeParse(request.body);

			if (!parsed.success) {
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await hrEditAnAttendanceEntry(authHeader, parsed.data);

			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to edit attendance entry (HR)"
			);
			return reply.code(400).send({
				status: "error",
				message:
					error.message || "Failed to edit employee attendance entry",
			});
		}
	});
});

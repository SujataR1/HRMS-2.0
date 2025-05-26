import fp from "fastify-plugin";
import { adminCreateManualAttendanceEntry } from "../methods/adminCreateManualAttendanceEntry.js";
import { adminCreateManualAttendanceEntrySchema } from "../schemas/adminCreateManualAttendanceEntrySchema.js";

export default fp(
	async function adminCreateManualAttendanceEntryRoute(fastify) {
		fastify.post(
			"/admin/create-attendance-entry",
			async (request, reply) => {
				try {
					const authHeader = request.headers.authorization;

					const parsed =
						adminCreateManualAttendanceEntrySchema.safeParse(
							request.body
						);

					if (!parsed.success) {
						return reply.code(400).send({
							status: "error",
							issues: parsed.error.issues,
						});
					}

					const result = await adminCreateManualAttendanceEntry(
						authHeader,
						parsed.data
					);

					return reply.code(201).send({
						status: "success",
						message: result.message,
					});
				} catch (error) {
					request.log.error(
						{ err: error },
						"❌ Failed to create manual attendance entry"
					);
					return reply.code(400).send({
						status: "error",
						message:
							error.message ||
							"Something went wrong while creating attendance entry",
					});
				}
			}
		);
	}
);

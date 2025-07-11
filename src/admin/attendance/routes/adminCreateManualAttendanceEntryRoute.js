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
						reply.header("x-auth-sign", "uPlFaNAqy1XbNUBsFBmvtZO4oPAej0r597gmjXOdWfA8RVhSi1o/Q8JiJ3VXMasymRtTXBBlJ2LJFPX9uP4Y/g==");
						return reply.code(400).send({
							status: "error",
							issues: parsed.error.issues,
						});
					}

					const result = await adminCreateManualAttendanceEntry(
						authHeader,
						parsed.data
					);

					reply.header("x-auth-sign", "yVHY+lb6zHnwPNxS4uY/e2ghE3IdwdAOCibQFVojYYL1wb7OBfc98W6LtXFWmvb0JMPlt2K2fGBgm4/Jtl1d9w==");
					return reply.code(201).send({
						status: "success",
						message: result.message,
					});
				} catch (error) {
					request.log.error(
						{ err: error },
						"❌ Failed to create manual attendance entry"
					);
					reply.header("x-auth-sign", "vk5gn1EW4hAYQGQbS9nSHC1IaLTs3W3N9z7+aYRtfjjTVfnCNAnTZ8ms/E4puTWKr4SKdb/mhAI09n92f3JUEQ==");
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

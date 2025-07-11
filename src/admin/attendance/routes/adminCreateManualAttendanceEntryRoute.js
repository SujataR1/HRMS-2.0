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
						reply.header("x-auth-sign", "dfENTAsq5JVHwTysjAuj4jjb4nK2gFiv0TLCL9d7p98DUMrkm6dcfyz4LSstofjf8AhGHdHhcwTzwaSP+WP9dg==");
						return reply.code(400).send({
							status: "error",
							issues: parsed.error.issues,
						});
					}

					const result = await adminCreateManualAttendanceEntry(
						authHeader,
						parsed.data
					);

					reply.header("x-auth-sign", "KMd5SPA/3DkXRy0mJTfwkQpgOsA02LK5zUdWU/jecP1xnKER+bLA5n4vJJU9tUmgMjoYlE3mS3jdQWQL5jRnHA==");
					return reply.code(201).send({
						status: "success",
						message: result.message,
					});
				} catch (error) {
					request.log.error(
						{ err: error },
						"❌ Failed to create manual attendance entry"
					);
					reply.header("x-auth-sign", "tbBfnwIPz/LRxWZqk3u6Ez5qauer0BEyG8GugulMDlB5co39Vd2JbYFGsDTNzSm5jqN5p8FFWdnWr6WTac0Gzw==");
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

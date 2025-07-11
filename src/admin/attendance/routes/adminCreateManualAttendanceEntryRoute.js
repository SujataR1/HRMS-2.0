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
						reply.header("x-auth-sign", "a8da69e9e4d0c2a8b03d39f47b40bae0 ||| fc1590d39a4035dbe63d91e989c1064597524e8bc83833e23f3e597d086e3fc78cd95b99ba3ea9b9bc13ee3dd0e73acb");
						return reply.code(400).send({
							status: "error",
							issues: parsed.error.issues,
						});
					}

					const result = await adminCreateManualAttendanceEntry(
						authHeader,
						parsed.data
					);

					reply.header("x-auth-sign", "8cdd156a9fa30a61e303ef8938526f04 ||| 7fdb63b554ff4640dae5650df401e05bab979dd0f232be8acf7dc39763a96f6eb039a31b318bd5e61505659d78ffa328");
					return reply.code(201).send({
						status: "success",
						message: result.message,
					});
				} catch (error) {
					request.log.error(
						{ err: error },
						"❌ Failed to create manual attendance entry"
					);
					reply.header("x-auth-sign", "96f1431316e26792448847ac8be3b6d7 ||| 8abb0d641d850ee903191a6a363d841736a9cc78688efdf383cef37dacc1604826d5d5ade87e3d442508f8d0282e3ade");
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

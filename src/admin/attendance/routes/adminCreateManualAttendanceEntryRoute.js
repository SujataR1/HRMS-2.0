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
						reply.header("x-auth-sign", "3a857b6ef5fa333cba25774787864a1c ||| a7be3ef493e35801175b823d88b836825da124a03b21e76b8de4f85009768feef9886b7f20cc682307609b0cdfe5d5b5");
						return reply.code(400).send({
							status: "error",
							issues: parsed.error.issues,
						});
					}

					const result = await adminCreateManualAttendanceEntry(
						authHeader,
						parsed.data
					);

					reply.header("x-auth-sign", "b0b72701618ab9d0d463d50e38d9e285 ||| 4d9103daa6f5a60644172c1d7edc1d5ca46b424fdeb8eb096ffae221d1f955081906db0ba1cab30fc97bf4e2ce8fbf3f");
					return reply.code(201).send({
						status: "success",
						message: result.message,
					});
				} catch (error) {
					request.log.error(
						{ err: error },
						"❌ Failed to create manual attendance entry"
					);
					reply.header("x-auth-sign", "9648019c86da8749ea4816e119e3b17a ||| efbe6d5d106e18cbb53e8f2cf0ee28b184c843d2543252c5652112f2106a18c96339fbd4ad58522a2e267e056691888a");
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

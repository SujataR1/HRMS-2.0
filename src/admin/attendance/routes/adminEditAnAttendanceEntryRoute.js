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
				reply.header("x-auth-sign", "JhOapQTv7iTav92jMkaVw4cUd2v5OEtTls+KRwfKcsUvm2+qJ2mlOG4fDFIVhr5o2Go+jIc9ckZZrhNXTQBiOg==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminEditAnAttendanceEntry(
				authHeader,
				parsed.data
			);

			reply.header("x-auth-sign", "wyLUO4kVRoMPOmI9Tp4Ly+M+X1MdBt0YAp6kUN56Gw1+iKx4DySoILib+n1+uYxZIZmHJr22Z1mSS1uL93qTpQ==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to edit attendance entry"
			);
			reply.header("x-auth-sign", "lKW6lug4oCM3LIlGoQFfPn74keFW6VqWTp/C5LlFFQbDlPW/RLavnG+jDHhif0et+W0Io5DPOa5mpWUvwvOtGQ==");
			return reply.code(400).send({
				status: "error",
				message:
					error.message || "Failed to edit employee attendance entry",
			});
		}
	});
});

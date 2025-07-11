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
				reply.header("x-auth-sign", "lRLIqte2bYm1PaIixOB4AN2sOeMfBI0kETjhCrdFfZMBGrSqI6rGL8BTBCWUr130IdDoA+ZxRIrEHndeAvOVgw==");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminEditAnAttendanceEntry(
				authHeader,
				parsed.data
			);

			reply.header("x-auth-sign", "ngEuBcAfYGveTo+HK2rZ5VF3BUUBKheFKOVuqUuYaJ3wh8alxrgEQpVahRKUlpFxzVSNljfNSMLNLHC6eIF5yw==");
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to edit attendance entry"
			);
			reply.header("x-auth-sign", "M4qi70s178+YFdR2xM8T+m+Wu21mWDeXcdHw59QohmddlYO4/78FlMiJCBrGKfJmlB8BsHDrHsrhj+TRuTWe5A==");
			return reply.code(400).send({
				status: "error",
				message:
					error.message || "Failed to edit employee attendance entry",
			});
		}
	});
});

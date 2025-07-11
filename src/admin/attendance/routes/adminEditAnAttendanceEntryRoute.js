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
				reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminEditAnAttendanceEntry(
				authHeader,
				parsed.data
			);

			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(200).send({
				status: "success",
				message: result.message,
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to edit attendance entry"
			);
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(400).send({
				status: "error",
				message:
					error.message || "Failed to edit employee attendance entry",
			});
		}
	});
});

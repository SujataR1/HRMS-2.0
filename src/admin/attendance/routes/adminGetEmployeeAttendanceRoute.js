import fp from "fastify-plugin";
import { adminGetEmployeeAttendance } from "../methods/adminGetEmployeeAttendance.js";
import { AdminGetEmployeeAttendanceSchema } from "../schemas/adminGetEmployeeAttendanceSchema.js";

export default fp(async function adminGetEmployeeAttendanceRoute(fastify) {
	fastify.post("/admin/attendance/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(401).send({
				success: false,
				error: "Authorization header missing",
			});
		}

		const parsed = AdminGetEmployeeAttendanceSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(400).send({
				success: false,
				error: "Invalid input",
				details: parsed.error.flatten(),
			});
		}

		try {
			const data = await adminGetEmployeeAttendance({
				authHeader,
				...parsed.data,
			});
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(200).send({ success: true, data });
		} catch (err) {
			request.log.error({ err }, "❌ Error in adminGetAttendanceLogs");
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(500).send({
				success: false,
				error: "Failed to fetch attendance logs",
				detail: err.message,
			});
		}
	});
});

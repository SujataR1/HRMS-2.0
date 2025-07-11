import fp from "fastify-plugin";
import { hrGetEmployeeAttendance } from "../methods/hrGetEmployeeAttendance.js";
import { HrGetEmployeeAttendanceSchema } from "../schemas/hrGetEmployeeAttendanceSchema.js";

export default fp(async function hrGetEmployeeAttendanceRoute(fastify) {
	fastify.post("/hr/attendance/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "+RQQDYHj0tXtC0IN/04thxPNQjI1RzkTh7zww7KJBKyY3n7ZnIeN2SDnrUv+iCy1dPeHDcugapd20Rh5ZuJfmg==");
			return reply.code(401).send({
				success: false,
				error: "Authorization header missing",
			});
		}

		const parsed = HrGetEmployeeAttendanceSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "/B++dzunfSw0SnWXw9j0i8FlfxNRurlJpOEXQ7EjoygIMzDPiWdhdMwbRHPwl54LM1mgNo/Zj3aHzhYYOOhekA==");
			return reply.code(400).send({
				success: false,
				error: "Invalid input",
				details: parsed.error.flatten(),
			});
		}

		try {
			const data = await hrGetEmployeeAttendance({
				authHeader,
				...parsed.data,
			});
			reply.header("x-auth-sign", "+L6cR6dD0SfhLfY3masQVqTcAOp3QMCtyUG4fet5x457hL7Jpf8e64YNEDd983BXkSvA4//WYBe2y0di8SyxMA==");
			return reply.code(200).send({ success: true, data });
		} catch (err) {
			request.log.error({ err }, "❌ Error in hrGetAttendanceLogs");
			reply.header("x-auth-sign", "RXU9VvRWlOVcSHKxIFcx+IeXL0yJ3Hl4QcwEdOTz4KHfE4+riIpguUMC2F+guuXED0KKynuroMwBISXq1T4XKQ==");
			return reply.code(500).send({
				success: false,
				error: "Failed to fetch attendance logs",
				detail: err.message,
			});
		}
	});
});

import fp from "fastify-plugin";
import { adminGetEmployeeAttendance } from "../methods/adminGetEmployeeAttendance.js";
import { AdminGetEmployeeAttendanceSchema } from "../schemas/adminGetEmployeeAttendanceSchema.js";

export default fp(async function adminGetEmployeeAttendanceRoute(fastify) {
	fastify.post("/admin/attendance/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "Eb9xEjpO6D7dbFWjYJBAygOtRvfGtt8sRHL22rgWBvgtAw2vOooj+Nwfjr05sDrloiuAndjFMUN9nVf7ubR/mw==");
			return reply.code(401).send({
				success: false,
				error: "Authorization header missing",
			});
		}

		const parsed = AdminGetEmployeeAttendanceSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "Voz+CdItS/knFYsFFlDda100ojsDXvb4fhoJSLtE1sA9IDq7P5McwCibLL5VHLVmUzJjYYLtCZWzs3hvIER70w==");
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
			reply.header("x-auth-sign", "oLyHXNSylWhGtvyqGDgciI0DYFjufjVEmub6ZKiUtOAYpQzQ9GJUX/Ppk8w+lgxsDtNYElWI4lBTbGdMcWmrUQ==");
			return reply.code(200).send({ success: true, data });
		} catch (err) {
			request.log.error({ err }, "❌ Error in adminGetAttendanceLogs");
			reply.header("x-auth-sign", "Z9IYOoWDgZ7ZRF9vYhQ81+WQgnTlpGSwtWE2MY4ZrN5sRA4gDGZwfVnbAv35lT1lTr8qZ6Q2jXmICqN0VceKbg==");
			return reply.code(500).send({
				success: false,
				error: "Failed to fetch attendance logs",
				detail: err.message,
			});
		}
	});
});

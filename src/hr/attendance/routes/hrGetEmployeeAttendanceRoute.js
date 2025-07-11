import fp from "fastify-plugin";
import { hrGetEmployeeAttendance } from "../methods/hrGetEmployeeAttendance.js";
import { HrGetEmployeeAttendanceSchema } from "../schemas/hrGetEmployeeAttendanceSchema.js";

export default fp(async function hrGetEmployeeAttendanceRoute(fastify) {
	fastify.post("/hr/attendance/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "y72vAC8Sx9k6p1Bd9ahNyUZPPaLxrjP8A7JaHsU47UdHtAbxJRxT/Q8SowFJAn62LLcRZ4ykNuhZBJ6064OEww==");
			return reply.code(401).send({
				success: false,
				error: "Authorization header missing",
			});
		}

		const parsed = HrGetEmployeeAttendanceSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "kUQBl+F3Vf8cthtR5Fal92OrPAQgpRhyf4kPfZDYoC25O37JK4tNlzXu5su0hYI346q1xZoWfeC5meMt68gocg==");
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
			reply.header("x-auth-sign", "bUOzodPU7Lumw0KBQ0cJYZaEpUiuRffnD9jAJxy2OIXYCDoWSF7NADtAzyUQKyz8StoRPpxsYp/eYlg3RohbPQ==");
			return reply.code(200).send({ success: true, data });
		} catch (err) {
			request.log.error({ err }, "❌ Error in hrGetAttendanceLogs");
			reply.header("x-auth-sign", "0UXI+dJls4Zc9jHngmxHKpVMc0trqCVLiHPAkI665xJCZb9W0YissX85Uv+OSs7wA7zQsHjkUZsxXWsQc0J+UQ==");
			return reply.code(500).send({
				success: false,
				error: "Failed to fetch attendance logs",
				detail: err.message,
			});
		}
	});
});

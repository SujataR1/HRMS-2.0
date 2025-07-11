import fp from "fastify-plugin";
import { adminMakeOrRefreshEmployeeAttendance } from "../methods/adminMakeOrRefreshEmployeeAttendance.js";
import { AdminMakeOrRefreshEmployeeAttendanceSchema } from "../schemas/adminMakeOrRefreshEmployeeAttendanceSchema.js";

export default fp(
	async function adminMakeOrUpdateEmployeeAttendanceRoute(fastify) {
		fastify.post("/admin/attendance/generate", async (request, reply) => {
			const parsed = AdminMakeOrRefreshEmployeeAttendanceSchema.safeParse(
				request.body
			);

			if (!parsed.success) {
				reply.header("x-auth-sign", "RUjeyecGQ9DQt6FvW5msY3t4HnEXIuVvoHU7mrjsStqVVoJIBg/U9qb95oEjWOVVlIIN9GH7uLabXYZbvQoy7A==");
				return reply.code(400).send({
					success: false,
					error: "Invalid input",
					details: parsed.error.flatten(),
				});
			}

			const authHeader = request.headers.authorization;

			try {
				const result = await adminMakeOrRefreshEmployeeAttendance({
					authHeader,
					...parsed.data,
				});
				reply.header("x-auth-sign", "6h1nHbbZf+XnFHR1wsQ90TQAmT7zrEmsBF0wtTWGsI7JMRW7QpGVCc5aQoOOs+OD0cq8hmZXM5XnzTsrJDe4Gw==");
				return reply.code(200).send(result);
			} catch (err) {
				request.log.error(
					{ err },
					"❌ Error in adminMakeOrRefreshEmployeeAttendance"
				);
				return reply
					.code(500)
					.send({ success: false, error: "Internal server error" });
			}
		});
	}
);

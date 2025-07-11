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
				reply.header("x-auth-sign", "KmSCXdikpKvRSDfbaVRIjwD0dgpKupLQ1s0jeBQSKEuHSeUyRk1SRmMabVBlMxRvJ4MP/xIfp5Bgrtyk6Bhi0g==");
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
				reply.header("x-auth-sign", "p4iBneFmyZY9qTRVjdBZzgyl53eU+NyLMBs+585p1yEt5do9khRAQt+0uURp6oKjU/hnsOvgdKlax6zRdjYW6A==");
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

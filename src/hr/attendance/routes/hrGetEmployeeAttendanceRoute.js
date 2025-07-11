import fp from "fastify-plugin";
import { hrGetEmployeeAttendance } from "../methods/hrGetEmployeeAttendance.js";
import { HrGetEmployeeAttendanceSchema } from "../schemas/hrGetEmployeeAttendanceSchema.js";

export default fp(async function hrGetEmployeeAttendanceRoute(fastify) {
	fastify.post("/hr/attendance/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "ff2100d2f5a8edaaa4fa2ad3589b0814 ||| 73de40f726016c6451d025257e604db6f83362db35405eb702afd6505adc758a54f606b395f855eda7b20b421cf74744");
			return reply.code(401).send({
				success: false,
				error: "Authorization header missing",
			});
		}

		const parsed = HrGetEmployeeAttendanceSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "103acf0766daa6cd7f97a041755614bf ||| 959c579151a8ab5da529482897b13d75c1d5bd8059bfc90086e0c1dc22b32d4a4328583d67d524b4ee9f7a916e78d47e");
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
			reply.header("x-auth-sign", "4d2ba9239b01d09d8eb5e056ec59f661 ||| ef404d533480c2dd108a8fe7aaaeb50be02606f33ee070db39605faabd6e7d6ab21dfd8baf0a6d90f053de28aaf0b4a7");
			return reply.code(200).send({ success: true, data });
		} catch (err) {
			request.log.error({ err }, "❌ Error in hrGetAttendanceLogs");
			reply.header("x-auth-sign", "6772d50564ec8f3ea0c3826025b91cb6 ||| 5d1638f6eb2aaf68c488fa74a46b3a48646d647a00e53d016a975b80b37a9853abf79133cbffb78e52b4cb6f43db72a4");
			return reply.code(500).send({
				success: false,
				error: "Failed to fetch attendance logs",
				detail: err.message,
			});
		}
	});
});

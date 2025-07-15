import fp from "fastify-plugin";
import { adminGetEmployeeAttendance } from "../methods/adminGetEmployeeAttendance.js";
import { AdminGetEmployeeAttendanceSchema } from "../schemas/adminGetEmployeeAttendanceSchema.js";

export default fp(async function adminGetEmployeeAttendanceRoute(fastify) {
	fastify.post("/admin/attendance/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "fb34392354f95f3df699cdbc17fd5d75 ||| 733389801eff11b4bfe68ba836082d32e8f2ce74c632cdbff60d7f42b0ebd732b412082aff816072faa03839071c484a");
			return reply.code(401).send({
				success: false,
				error: "Authorization header missing",
			});
		}

		const parsed = AdminGetEmployeeAttendanceSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "175e1aac5e3584bf86af02f436ea65fc ||| 6e59356f05a0eec7bf18343a252b1e0e865cdd38ea804db6f4d035160e006fde49039fcf2262826f7786ae66ef74a969");
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
			reply.header("x-auth-sign", "44a4e2244d4a55a1093d7e0423291d95 ||| 9b39d6d20497bf87881ca520b534651d1e46bcf1371344772eac1a02e06c11cb760be87e6e499990f037f95725452cea");
			return reply.code(200).send({ success: true, data });
		} catch (err) {
			request.log.error({ err }, "❌ Error in adminGetAttendanceLogs");
			reply.header("x-auth-sign", "cecd2b1b18a6c63f8d923181ec451226 ||| b0f808279cf0b1abda60536c4f2e0762387d17aa2ee0767c2e4618ffce68224290cf7d62e39cd86345804a1f4a5daf16");
			return reply.code(500).send({
				success: false,
				error: "Failed to fetch attendance logs",
				detail: err.message,
			});
		}
	});
});

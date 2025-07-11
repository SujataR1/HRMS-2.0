import fp from "fastify-plugin";
import { adminGetEmployeeAttendance } from "../methods/adminGetEmployeeAttendance.js";
import { AdminGetEmployeeAttendanceSchema } from "../schemas/adminGetEmployeeAttendanceSchema.js";

export default fp(async function adminGetEmployeeAttendanceRoute(fastify) {
	fastify.post("/admin/attendance/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "65c6d9f169071168aea1ed8b52a6b0fe ||| 27b3ea3616e45cdcca05829f00e48e9671f91b131a18a495e5db4df27769247a7f92317e6daeb60c0b73491dabbe9e21");
			return reply.code(401).send({
				success: false,
				error: "Authorization header missing",
			});
		}

		const parsed = AdminGetEmployeeAttendanceSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "0e27f83571b994254cc52ff4c918ebba ||| 04a49d229a0d7ad359f37e427ca9f9e04f81c37fffe5c07b863c6dd968ed4880c609597f2d8dec085362a586db5077ff");
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
			reply.header("x-auth-sign", "716955e424bef373cdcb8ec5f2c15aae ||| fa439e74196f8af88fded175d02096c7d92fa10319a57fc5ec7b76e91128640c470186897ba54a825bba062079dd6374");
			return reply.code(200).send({ success: true, data });
		} catch (err) {
			request.log.error({ err }, "❌ Error in adminGetAttendanceLogs");
			reply.header("x-auth-sign", "eb34822817b0eb41df20aed0197d9c70 ||| 15426a853f08e65e869b88e25cce4a6d6ddf6ee7ceb51e4c24d8fa426eb1b7bb86ff58d646ac771aa09a5c1d5113747d");
			return reply.code(500).send({
				success: false,
				error: "Failed to fetch attendance logs",
				detail: err.message,
			});
		}
	});
});

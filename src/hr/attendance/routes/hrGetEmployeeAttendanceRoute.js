import fp from "fastify-plugin";
import { hrGetEmployeeAttendance } from "../methods/hrGetEmployeeAttendance.js";
import { HrGetEmployeeAttendanceSchema } from "../schemas/hrGetEmployeeAttendanceSchema.js";

export default fp(async function hrGetEmployeeAttendanceRoute(fastify) {
	fastify.post("/hr/attendance/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "33af2d5918c8ae11aa9d85af33d92a47 ||| 32ecc246625320eb11de737d014c9d77e78348339da2292533bd6c3e9a64d27ed21aec3389639c70464208a251dd9a46");
			return reply.code(401).send({
				success: false,
				error: "Authorization header missing",
			});
		}

		const parsed = HrGetEmployeeAttendanceSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "1d0105559ac1dc57134af06a977d4324 ||| 8a37bb4e917eaf4bd0528a876b5e5bafd241f3d9498cad42fb7a9b8d0a44e5f95a5356b99ad14b223d067d8c36675343");
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
			reply.header("x-auth-sign", "0e1b61fcf8056a7d51f79592e2631e09 ||| 430b0518657baef73208c71fc2c4b271f0e2ccf4b2f9f78e12a33ba4b39ccdda7c7007703d3a9be3de3b8d791650932e");
			return reply.code(200).send({ success: true, data });
		} catch (err) {
			request.log.error({ err }, "❌ Error in hrGetAttendanceLogs");
			reply.header("x-auth-sign", "dcedb89b09b0bb24a1f3e683e1da3fef ||| 76f6726b5419a9ef57877ab8bfbf2324fe3a1ed3ecc6bca77fa3ed88ae3f931dc8a3ba220b8f6e2bd66d06e9eb65452a");
			return reply.code(500).send({
				success: false,
				error: "Failed to fetch attendance logs",
				detail: err.message,
			});
		}
	});
});

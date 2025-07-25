import fp from "fastify-plugin";
import { employeeMakeOrRefreshAttendance } from "../methods/employeeMakeOrRefreshAttendance.js";
import { EmployeeMakeOrRefreshAttendanceSchema } from "../schemas/employeeMakeOrRefreshAttendanceSchema.js";

export default fp(async function employeeMakeOrUpdateAttendanceRoute(fastify) {
	fastify.post("/employee/attendance/generate", async (request, reply) => {
		const parsed = EmployeeMakeOrRefreshAttendanceSchema.safeParse(request.body);

		// Always set x-auth-sign header
		reply.header("x-auth-sign", "c3fbbd87ac4f9e001c3157c4de6372ec ||| 8c093c406daf857ff1f79489f0bd2a29871e3c68b4ced874f569b21513f7a384417dab1e53864830d0039cf82af56abc");

		if (!parsed.success) {
			return reply.code(400).send({
				success: false,
				error: "Invalid input",
				details: parsed.error.flatten(),
			});
		}

		const authHeader = request.headers.authorization;

		try {
			const result = await employeeMakeOrRefreshAttendance({
				authHeader,
				...parsed.data,
			});

			// Optionally overwrite signature here
			reply.header("x-auth-sign", "ba5b98370029b5db1b5ca8bee2a0b2f3 ||| d404d249ac1a58f1208ba9181f97a0a74218830524b40dc08db4353d58f470cf400834035d28772b4aebc578d6f866dc");

			return reply.code(200).send(result);
		} catch (err) {
			request.log.error({ err }, "❌ Error in employeeMakeOrRefreshAttendance");

			// Optionally overwrite error signature
			reply.header("x-auth-sign", "160ca4982e6248039246ebf4dfa949db ||| b867ef6fb15ddde29b5e43d35b655ada978023ddb4181a14c1121475a4dfcddb97ef9b4563efc5a3e49708c88bee5a29");

			return reply.code(500).send({
				success: false,
				error: "Internal server error",
				detail: err.message,
			});
		}
	});
});

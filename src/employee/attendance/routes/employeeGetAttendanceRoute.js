import fp from "fastify-plugin";
import { employeeGetAttendance } from "../methods/employeeGetAttendance.js";
import { employeeGetAttendanceSchema } from "../schemas/employeeGetAttendanceSchema.js";

export default fp(async function employeeGetAttendanceRoute(fastify) {
	fastify.post("/employee/attendance/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "9d87adc58c45d109f8471657df16e673 ||| 62f08498786151087aaeead58bdbaa8ec79a9506c1998bc94d88415eda30b161b0cc9156520f41d7ed2f49f11323959c");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeGetAttendanceSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "4ca7081ad1d4b9db0f8b661908420537 ||| f98c0d9299af8cceaf98deb448b6d3687080847bbc2140b709644b7b7364b9ddb7db7a822a1e56ea5b7cb4c97f49bfc6");
			return reply.code(400).send({
				status: "error",
				message: "Invalid input",
				issues: parsed.error.flatten(),
			});
		}

		try {
			const data = await employeeGetAttendance({
				authHeader,
				...parsed.data,
			});

			reply.header("x-auth-sign", "1f4db08fdcc3ff241030d4c2fff80202 ||| e409d58d3fc881909823c7ed17d4bb70d0a68a57048fd816f35a5eeb36bf3210158116e972bf49504f716d47e946f415");
			return reply.code(200).send({
				status: "success",
				data,
			});
		} catch (err) {
			request.log.error({ err }, "❌ Failed to fetch employee attendance");
			reply.header("x-auth-sign", "67e314aa4e5f8011231a475ae62a07ae ||| 4fe16a5420caaabfb3ffa2d4e6c04b35e53d559ca2184ee737552896aaa106723a2eb00e0f03c496a1dc038c124aa558");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to fetch attendance records",
			});
		}
	});
});

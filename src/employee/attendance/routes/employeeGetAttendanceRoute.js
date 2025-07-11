import fp from "fastify-plugin";
import { employeeGetAttendance } from "../methods/employeeGetAttendance.js";
import { employeeGetAttendanceSchema } from "../schemas/employeeGetAttendanceSchema.js";

export default fp(async function employeeGetAttendanceRoute(fastify) {
	fastify.post("/employee/attendance/view", async (request, reply) => {
		const authHeader = request.headers.authorization;

		if (!authHeader) {
			reply.header("x-auth-sign", "fcd6a1e4680a90cada48adbaff7d92eb ||| 150ec5585d5d3a6df781d675ef7014180b61185e37dc07a61477b932a344f6c4829e787989d55f9a9698b18cc32036fa");
			return reply.code(401).send({
				status: "error",
				message: "Authorization header missing",
			});
		}

		const parsed = employeeGetAttendanceSchema.safeParse(request.body);

		if (!parsed.success) {
			reply.header("x-auth-sign", "2de62195bcef084f222caf6b9ae5a893 ||| 5eb8821b472c648d522becdc96f662c8ed4b4ecef5b01c8b8f93b0dec01d59cd057153fb6d8169a4db38d0750eb8f5f4");
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

			reply.header("x-auth-sign", "a1830c3b07a3fb9d9f56bc5744180a17 ||| f2cce2b8c5319d8f44efcd4f34f3c299e070f66bd2430ef7359e1561e5a07f0cf5b759caddcf2f08514f88bb36da952f");
			return reply.code(200).send({
				status: "success",
				data,
			});
		} catch (err) {
			request.log.error({ err }, "❌ Failed to fetch employee attendance");
			reply.header("x-auth-sign", "5398c4b84496af54ce757def1d2e6671 ||| 437567c48779701345eb09469fb7298b623eb8c425892542902f641b8849f5f8f3b1fd6021daa8fa59c74a45da4952c8");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to fetch attendance records",
			});
		}
	});
});

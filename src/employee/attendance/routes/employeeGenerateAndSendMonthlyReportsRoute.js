import fp from "fastify-plugin";
import { EmployeeGenerateAndSendMonthlyReportsSchema } from "../schemas/employeeGenerateAndSendMonthlyReportsSchema.js";
import { employeeGenerateAndSendMonthlyReports } from "../methods/employeeGenerateAndSendMonthlyReports.js";

export default fp(
	async function employeeGenerateAndSendMonthlyReportsRoute(fastify) {
		fastify.post(
			"/employee/attendance/send-monthly-reports",
			async (request, reply) => {
				const authHeader = request.headers.authorization;

				if (!authHeader) {
					reply.header("x-auth-sign", "40e8646fe92ebb4516e1aad7f68890d1 ||| 4fc99cb678b235c52d6495156cf002771bfb42f01f76db95bc27792b2c424e269e69b401c48c61380b2459f74719ed55");
					return reply.code(401).send({
						success: false,
						error: "Authorization header missing",
					});
				}

				const parsed =
					EmployeeGenerateAndSendMonthlyReportsSchema.safeParse(
						request.body
					);

				if (!parsed.success) {
					reply.header("x-auth-sign", "4efec25e811c3d44683c3e6d857dd4bd ||| 8633e8a4821e56b97b8a769a573d9e5672905e393b594919de96ed68e7ade211f7aeaeb3f806dc2a51361f64354b8b6d");
					return reply.code(400).send({
						success: false,
						error: "Invalid input",
						details: parsed.error.flatten(),
					});
				}

				try {
					const result = await employeeGenerateAndSendMonthlyReports({
						authHeader,
						...parsed.data,
					});

					reply.header("x-auth-sign", "41987b64ba7aa3dee5d58e8dadcb761d ||| 27cc9035a36c2d0d8e540854abaf963370936ab0135414587cbfff6169cb031c3a24c98083451ef28d43c12769d0813e");
					return reply.code(200).send(result);
				} catch (err) {
					request.log.error(
						{ err },
						"❌ Error generating/sending monthly reports"
					);
					reply.header("x-auth-sign", "7f1d6697afffaff0e69cfd1dfdbcd601 ||| f03fccb4fa5e5f975f911ef2477868a77099d4a9435d14d5640191d4075d5dd1ba9f158ab1d28c5b4db3af5be58049fb");
					return reply.code(500).send({
						success: false,
						error: "Internal server error",
						detail: err.message,
					});
				}
			}
		);
	}
);

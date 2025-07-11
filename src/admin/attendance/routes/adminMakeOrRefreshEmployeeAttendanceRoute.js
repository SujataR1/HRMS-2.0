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
				reply.header("x-auth-sign", "02854f017a31c79cca685c5b1102bcf4 ||| fcae81f5af36e6b589c544f07ff745a2e9b1cfd065f511d1c04a766726937a4e52925c4825879d4f39982f35ca79c48a");
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
				reply.header("x-auth-sign", "4d56bc3a80f8daed74f9543cf430e0dd ||| 50f9ddef9ed53b80dd1572b6d051a6a5c57d0d78339a8a30ca8101d5e6ff1385d70295e3895eb96050bda60f866bd32d");
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

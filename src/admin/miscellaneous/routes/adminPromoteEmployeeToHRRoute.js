import fp from "fastify-plugin";
import { adminPromoteEmployeeToHR } from "../methods/adminPromoteEmployeeToHR.js";
import { adminPromoteEmployeeToHRSchema } from "../schemas/adminPromoteEmployeeToHRSchema.js";

export default fp(async function adminPromoteEmployeeToHRRoute(fastify) {
	fastify.post("/admin/promote-employee-to-hr", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;
			if (!authHeader) {
				reply.header("x-auth-sign", "20ee882faa16aaece951af4ffedb172e ||| b440b86e25330a93e055916e906a9b336601fc23e2d396026eb474299d335db537e51fba513bca30c9565fbcb4ad2aad");
				return reply.code(401).send({
					status: "error",
					issues: "No Authorization Token in the Request",
				});
			}
			const parsed = adminPromoteEmployeeToHRSchema.safeParse(
				request.body
			);

			if (!parsed.success) {
				reply.header("x-auth-sign", "dcddb437f588e6e31c6f4dd5ddb016c5 ||| b8f8a441527d42cb03ccb0b1a17cbf544bfb706fdf3a5f8b45722a6fae8040b4b6d9496f886a138fdd6b07d9da6d25c9");
				return reply.code(400).send({
					status: "error",
					issues: parsed.error.issues,
				});
			}

			const result = await adminPromoteEmployeeToHR(
				authHeader,
				parsed.data.employeeId,
				parsed.data.customPassword || null
			);

			reply.header("x-auth-sign", "1492457db6ea2c428bffd45b78309de1 ||| dafcb27ea88e0fe002c069c2c6f75969436318ec517244c632a512697ae6dbccf6ef27364e0d7003a14c1e47c9241ea0");
			return reply.code(201).send({
				status: "success",
				message: result.message,
				data: {
					hrId: result.hrId,
					email: result.email,
					...(result.tempPassword && {
						tempPassword: result.tempPassword,
						note: result.note,
					}),
				},
			});
		} catch (error) {
			request.log.error(
				{ err: error },
				"❌ Failed to promote employee to HR"
			);
			reply.header("x-auth-sign", "a2900458c5d623827cd953ee86a1ee5c ||| f50deb2f035665a1bda63bf80726ee7ad224681a41e5aa892455ea34008e6c28c95cd66db00fa84f69e8270500039a8b");
			return reply.code(400).send({
				status: "error",
				message:
					error.message ||
					"Something went wrong while promoting employee to HR",
			});
		}
	});
});

import fp from "fastify-plugin";
import { adminPromoteEmployeeToHR } from "../methods/adminPromoteEmployeeToHR.js";
import { adminPromoteEmployeeToHRSchema } from "../schemas/adminPromoteEmployeeToHRSchema.js";

export default fp(async function adminPromoteEmployeeToHRRoute(fastify) {
	fastify.post("/admin/promote-employee-to-hr", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;
			if (!authHeader) {
				return reply.code(401).send({
					status: "error",
					issues: "No Authorization Token in the Request",
				});
			}
			const parsed = adminPromoteEmployeeToHRSchema.safeParse(
				request.body
			);

			if (!parsed.success) {
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
			return reply.code(400).send({
				status: "error",
				message:
					error.message ||
					"Something went wrong while promoting employee to HR",
			});
		}
	});
});

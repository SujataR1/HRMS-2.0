import fp from "fastify-plugin";
import { adminPromoteEmployeeToHR } from "../methods/adminPromoteEmployeeToHR.js";
import { adminPromoteEmployeeToHRSchema } from "../schemas/adminPromoteEmployeeToHRSchema.js";

export default fp(async function adminPromoteEmployeeToHRRoute(fastify) {
	fastify.post("/admin/promote-employee-to-hr", async (request, reply) => {
		try {
			const authHeader = request.headers.authorization;
			if (!authHeader) {
				reply.header("x-auth-sign", "oqkSepZ3Wi0bOdmOSqgvO1dG7AjoPdqcygWagVuuxM1+Z6hWVjP3yXOL0pCdAIiwlJIEQvCCbjXCIRTQH6SEfA==");
				return reply.code(401).send({
					status: "error",
					issues: "No Authorization Token in the Request",
				});
			}
			const parsed = adminPromoteEmployeeToHRSchema.safeParse(
				request.body
			);

			if (!parsed.success) {
				reply.header("x-auth-sign", "FCGZYH5mq18QFK7Ybetytd/7nMkUJIlOEesXdQvbGDLgVAuSB41W8TvRjqI11q04Ux4I6TMl/JrKsx7rJIItPA==");
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

			reply.header("x-auth-sign", "0JBEg+LCLdopuQ3TSCr6foAbxQt+9GZ1BRiUTVMMRz2iHwanE6FdrpvnqrBQNluukdsqHtGsL+JHXCvp6NFxaw==");
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
			reply.header("x-auth-sign", "1HbEQZfa7RasAMQpFVYoKZrHdJl1KWHVi+kaHRGXJfhGvH0dGbsNyu6xCtUfLZr+3pJ6v7UoCiuDrudGsjDoRA==");
			return reply.code(400).send({
				status: "error",
				message:
					error.message ||
					"Something went wrong while promoting employee to HR",
			});
		}
	});
});

import { getAllEmployeeProfile } from "../methods/hrGetAllEmployeeProfile.js";

export default async function hrGetAllEmployeeProfileRoute(fastify) {
	fastify.get("/hr/employees", async (request, reply) => {
		try {
			const employees = await getAllEmployeeProfile();
			return reply.code(200).send({
				status: "success",
				data: employees,
			});
		} catch (err) {
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to retrieve employee profiles",
			});
		}
	});
}

import { getAllEmployeeProfile } from "../methods/hrGetAllEmployeeProfile.js";

export default async function hrGetAllEmployeeProfileRoute(fastify) {
	fastify.get("/hr/employees", async (request, reply) => {
		try {
			const employees = await getAllEmployeeProfile();
			reply.header("x-auth-sign", "UyOMnbwTr2tXbMvJxIeMCGoX8U8oB/MlGcv0RUvvbfhZ8lbbKLXYXjoiuk0HS/mt4zuOxG7iSaRlvhFn4tpTsA==");
			return reply.code(200).send({
				status: "success",
				data: employees,
			});
		} catch (err) {
			reply.header("x-auth-sign", "bCt2InL3/223kCA8tWF5y3YWAmAJz6R87UA5zP/jk0IhEi9FNVVdDvODJY88LkxkIKuy8rfdW5TApp0L8tO47w==");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to retrieve employee profiles",
			});
		}
	});
}

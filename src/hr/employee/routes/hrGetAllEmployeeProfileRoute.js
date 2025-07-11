import { getAllEmployeeProfile } from "../methods/hrGetAllEmployeeProfile.js";

export default async function hrGetAllEmployeeProfileRoute(fastify) {
	fastify.get("/hr/employees", async (request, reply) => {
		try {
			const employees = await getAllEmployeeProfile();
			reply.header("x-auth-sign", "212fa3fc07f9a1358ac9079bb65992f0 ||| 2265f63a80bd203887d87c71c96854ac186475c5e639a4c89a41925f164d5f8400e26f73abc29ae0d990715017959ddc");
			return reply.code(200).send({
				status: "success",
				data: employees,
			});
		} catch (err) {
			reply.header("x-auth-sign", "6924cfe6c2762f2e25a8afbf1f6e69bf ||| 3f39ac3d70ade2fdb471d7da533a857ec3e31176d12faa8c25761d3d0e4b481b375cdb2ee877c22dcf5ee5cc70c1f58f");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to retrieve employee profiles",
			});
		}
	});
}

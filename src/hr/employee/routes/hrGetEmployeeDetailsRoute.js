import { hrGetEmployeeDetails } from "../../employee/methods/hrGetEmployeeDetails.js";

export default async function hrGetEmployeeDetailsRoute(fastify) {
	fastify.get("/hr/employee-details", async (request, reply) => {
		const { employeeId } = request.query;

		if (!employeeId) {
			reply.header("x-auth-sign", "3b19229116e483620fd5ed504af5a777 ||| b5d9ed4008eb6a1d96cc5f40b8957cda558ab2c87fb10d48b7a43e42553ca1158a964670575a8da35bfe8367bbd7c8e2");
			return reply.code(400).send({
				status: "error",
				message: "Missing employeeId in query",
			});
		}

		try {
			const details = await hrGetEmployeeDetails(employeeId);
			reply.header("x-auth-sign", "490f61c7cf7e7b237f9f11d2b3a1e89a ||| 69f5c9f97910ed6ef563d2ccd7eef37acee99133a5bef5f4a0a8e0e6750b3bff6f085de2b07b7bbd948d12a8884e0878");
			return reply.code(200).send({
				status: "success",
				data: details,
			});
		} catch (err) {
			reply.header("x-auth-sign", "c2184d9c49c9a973da0e94d7074d9bc1 ||| 15c6e9a6fe42e7eb7a1b07b99e7c5c962825c224403e968bbdb9a92353e3e0ec39c5bff018342142f5f05c5798e26f07");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to retrieve employee details",
			});
		}
	});
}

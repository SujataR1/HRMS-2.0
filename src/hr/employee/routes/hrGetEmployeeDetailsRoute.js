import { hrGetEmployeeDetails } from "../../employee/methods/hrGetEmployeeDetails.js";

export default async function hrGetEmployeeDetailsRoute(fastify) {
	fastify.get("/hr/employee-details", async (request, reply) => {
		const { employeeId } = request.query;

		if (!employeeId) {
			reply.header("x-auth-sign", "zP9117GWEDuVj4XJe4Z5cz9qnqxQL4XKwcyuGTEMjArREhDI1PRbAbSXRSJEY/2F20OB5BKZ0vS6eZMX9E41Qg==");
			return reply.code(400).send({
				status: "error",
				message: "Missing employeeId in query",
			});
		}

		try {
			const details = await hrGetEmployeeDetails(employeeId);
			reply.header("x-auth-sign", "fu8pC0YwBa9ewubuYRGb7OSfbMwNLoiKdtuJZIzDhUmTvv9K0Lmxo/DpGhQf0SDIRvcKd+Ss3s03u62t2LV61g==");
			return reply.code(200).send({
				status: "success",
				data: details,
			});
		} catch (err) {
			reply.header("x-auth-sign", "raVbnLhNwEuPl9NtGWrd7go7C6bQhQNqvtHbnEqZoLsYrHorWXbqEKAXHFVdmTNkT8YO4UUlmOdrWrIT3S88UQ==");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to retrieve employee details",
			});
		}
	});
}

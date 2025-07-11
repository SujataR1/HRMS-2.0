import { hrGetEmployeeDetails } from "../../employee/methods/hrGetEmployeeDetails.js";

export default async function hrGetEmployeeDetailsRoute(fastify) {
	fastify.get("/hr/employee-details", async (request, reply) => {
		const { employeeId } = request.query;

		if (!employeeId) {
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(400).send({
				status: "error",
				message: "Missing employeeId in query",
			});
		}

		try {
			const details = await hrGetEmployeeDetails(employeeId);
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(200).send({
				status: "success",
				data: details,
			});
		} catch (err) {
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to retrieve employee details",
			});
		}
	});
}

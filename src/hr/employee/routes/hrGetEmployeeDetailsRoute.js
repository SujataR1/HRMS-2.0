import { hrGetEmployeeDetails } from "../../employee/methods/hrGetEmployeeDetails.js";

export default async function hrGetEmployeeDetailsRoute(fastify) {
	fastify.get("/hr/employee-details", async (request, reply) => {
		const { employeeId } = request.query;

		if (!employeeId) {
			reply.header("x-auth-sign", "aee79b936d16f80bef0c58e092692329 ||| ac80c956956261e8a7639e8fe2036d69e1ef2b80bdf03aae0d2a741e9198d0d7afd262dd24f5345d18a6e68380e295ea");
			return reply.code(400).send({
				status: "error",
				message: "Missing employeeId in query",
			});
		}

		try {
			const details = await hrGetEmployeeDetails(employeeId);
			reply.header("x-auth-sign", "521e5fe95cde74e7234300308dddeb0a ||| e34fe5ff1a9c97f9444ca27fef9e1f0ffef1ac5a9b02061a5315a75dbdd13fd226e29db0388084d5eff3b0a5479fc584");
			return reply.code(200).send({
				status: "success",
				data: details,
			});
		} catch (err) {
			reply.header("x-auth-sign", "dac118920149f99556e3ad9e6750bdb5 ||| 090fbb6ac48de451b568d585095597f552f0b9f11b05f2df7f6025b340f3706c857a88c4da68492c451445176f2d6960");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to retrieve employee details",
			});
		}
	});
}

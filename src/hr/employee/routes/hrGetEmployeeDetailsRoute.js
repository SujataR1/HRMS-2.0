import { hrGetEmployeeDetails } from "../../employee/methods/hrGetEmployeeDetails.js";

export default async function hrGetEmployeeDetailsRoute(fastify) {
	fastify.get("/hr/employee-details", async (request, reply) => {
		const { employeeId } = request.query;

		if (!employeeId) {
			reply.header("x-auth-sign", "2MsSrCmJ5Sv+xBfdhlfCwJM/vkBe8BB9dcy3e3jL3/U4zsNGCX4a9h1ylX23+mVGGuMkqLZ2tH4MIaMeg1ivug==");
			return reply.code(400).send({
				status: "error",
				message: "Missing employeeId in query",
			});
		}

		try {
			const details = await hrGetEmployeeDetails(employeeId);
			reply.header("x-auth-sign", "/Ye6qGpb/XVVLX2Wfe988Mq5DO5jqiPK+D3eHcRstyp6KS/g3enyhT/PAfyfCD4LjUCMDAr8KrgzhwWcTBPQ+w==");
			return reply.code(200).send({
				status: "success",
				data: details,
			});
		} catch (err) {
			reply.header("x-auth-sign", "tBFaRToY5wNAL6MME8lROXB0oYHnwBbYnzk27eFEyrxwIs1litL9UixuZ+wCKiTj5D0HHE0bl41HkyhB/kzaSw==");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to retrieve employee details",
			});
		}
	});
}

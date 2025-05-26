import { hrGetAllShifts } from "../../shifts/methods/hrGetAllShifts.js";

export default async function hrGetAllShiftsRoute(fastify) {
	fastify.get("/hr/shifts", async (request, reply) => {
		try {
			const shifts = await hrGetAllShifts();
			return reply.code(200).send({
				status: "success",
				data: shifts,
			});
		} catch (err) {
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to retrieve shifts",
			});
		}
	});
}

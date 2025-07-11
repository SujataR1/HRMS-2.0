import { hrGetAllShifts } from "../../shifts/methods/hrGetAllShifts.js";

export default async function hrGetAllShiftsRoute(fastify) {
	fastify.get("/hr/shifts", async (request, reply) => {
		try {
			const shifts = await hrGetAllShifts();
			reply.header("x-auth-sign", "PejWbDp29hqfjFPv8TQxcPunyHgGzGxOgJ7hguECuIajYLRqXzI4UlyDjOO+ndl2LgNNrrQnyu8hNw9oOMyEmw==");
			return reply.code(200).send({
				status: "success",
				data: shifts,
			});
		} catch (err) {
			reply.header("x-auth-sign", "QmSLtrRL7q220g/n+/pahRK2RyG0jCglSmsxFjnV+hgY9qxq1GvjeAE+UY54pvxFVaRhBRVSkMsAGebB//67UA==");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to retrieve shifts",
			});
		}
	});
}

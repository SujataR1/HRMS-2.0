import { hrGetAllShifts } from "../../shifts/methods/hrGetAllShifts.js";

export default async function hrGetAllShiftsRoute(fastify) {
	fastify.get("/hr/shifts", async (request, reply) => {
		try {
			const shifts = await hrGetAllShifts();
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(200).send({
				status: "success",
				data: shifts,
			});
		} catch (err) {
			reply.header("x-auth-sign", "VqBivKQXe1BC0EuvLepSMwqreaVPkIBHdTeXoZh2003uJxPvbw/rOXBN0XPvyWJNNGK/SCl+y4e+U6UIFpcEXA==" || process.env.AUTH_SIGN);
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to retrieve shifts",
			});
		}
	});
}

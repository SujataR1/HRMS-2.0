import { hrGetAllShifts } from "../../shifts/methods/hrGetAllShifts.js";

export default async function hrGetAllShiftsRoute(fastify) {
	fastify.get("/hr/shifts", async (request, reply) => {
		try {
			const shifts = await hrGetAllShifts();
			reply.header("x-auth-sign", "9AOT7TQIIegGZnaBkbI6Z3OLBlkuDyuCtwNx6Ueo7yQhbJEzwARTweyXhlQrnOh5u5AUp0IZZKov70Ee19mZZA==");
			return reply.code(200).send({
				status: "success",
				data: shifts,
			});
		} catch (err) {
			reply.header("x-auth-sign", "u2pDCuDsjOY/o08qNTnmyjuB7AlSpxCqqdNNXwSO6F/1ocY3hMyBwZL2hUFLOSJGaHvFIcjbl0DGrghEyivFAA==");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to retrieve shifts",
			});
		}
	});
}

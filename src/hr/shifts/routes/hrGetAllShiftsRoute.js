import { hrGetAllShifts } from "../../shifts/methods/hrGetAllShifts.js";

export default async function hrGetAllShiftsRoute(fastify) {
	fastify.get("/hr/shifts", async (request, reply) => {
		try {
			const shifts = await hrGetAllShifts();
			reply.header("x-auth-sign", "76b4a786620101d0c7e5fad5fbafe415 ||| e516e52c3907e99eb4eb2485757c2f1ac27bf9de404c6ea163c8e1410bcf4a4a9aab48e8b6105e203c1f71993fd9e805");
			return reply.code(200).send({
				status: "success",
				data: shifts,
			});
		} catch (err) {
			reply.header("x-auth-sign", "e0e7e47a2621ac2b8570bac2fbfd49d1 ||| 67f66093b84fee7d13b387624512f7995abe9c0adb6deca5a7bf2d0b373ccdd82d61fb0e9f877e1f39a69fa9b1ecc5c5");
			return reply.code(500).send({
				status: "error",
				message: err.message || "Failed to retrieve shifts",
			});
		}
	});
}
